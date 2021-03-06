const fetch = require('node-fetch')
const lxd = require('../lxd')
const { getCloudInitStatus } = require('../lxd/cloud-init')

const profiles = async function (parent, args, { lxdEndpoint, agent }, info) {
  const responses = await Promise.all(
    parent.profiles.map((p) =>
      fetch(`${lxdEndpoint}/1.0/profiles/${p}`, { agent: agent })
    )
  )
  const profiles = await Promise.all(responses.map((r) => r.json()))
  return profiles.map((p) => p.metadata)
}

const network = async function (parent, args, { lxdEndpoint, agent }, info) {
  const {
    metadata: { network },
  } = await fetch(`${lxdEndpoint}/1.0/instances/${parent.name}/state`, {
    agent: agent,
  }).then((r) => {
    return r.json()
  })
  if (network) {
    return Object.keys(network)
      .map((key) => {
        return {
          name: key,
          ...network[key],
          macAddress: network[key].hwaddr,
          addresses: network[key].addresses.filter((address) => {
            return address.family !== 'inet6'
          }),
          ...network[key].counters,
        }
      })
      .filter((network) => {
        return network.addresses.length > 0 && network.type !== 'loopback'
      })
  } else {
    return []
  }
}

const cloudInitComplete = function (parent, args, context, info) {
  return lxd.cloudInit
    .getCloudInitStatus(parent.name)
    .then((result) => {
      return result.includes('done')
    })
    .catch(() => {
      return true
    })
}

const application = async function (
  parent,
  args,
  { lxdEndpoint, agent },
  info
) {
  const profilesResult = await profiles(
    parent,
    args,
    { lxdEndpoint, agent },
    info
  )
  const applications = [
    'grafana',
    'ignition',
    'codesys',
    'mosquitto',
    'nginx',
    'node-red',
    'postgres',
    'tentacle',
  ]
  return (
    applications.find((application) => {
      return profilesResult.some((p) => p.name === application)
    }) || 'Uknown'
  )
}

module.exports = {
  profiles,
  network,
  cloudInitComplete,
  application,
}
