const fetch = require('node-fetch')

const changeContainerState = async function ({
  lxdEndpoint,
  agent,
  containerName,
  action,
}) {
  const result = await fetch(
    `${lxdEndpoint}/1.0/instances/${containerName}/state`,
    {
      method: 'PUT',
      agent,
      body: JSON.stringify({
        action,
        timeout: 30,
        force: false,
      }),
    }
  )
  console.log(result)
  return fetch(`${lxdEndpoint}/1.0/instances/${containerName}`, {
    agent,
  })
    .then((result) => result.json())
    .then((data) => data.metadata)
}

const start = async function ({ lxdEndpoint, agent, containerName }) {
  return changeContainerState({
    lxdEndpoint,
    agent,
    containerName,
    action: 'start',
  })
}

const stop = async function ({ lxdEndpoint, agent, containerName }) {
  return changeContainerState({
    lxdEndpoint,
    agent,
    containerName,
    action: 'stop',
  })
}

const restart = async function ({ lxdEndpoint, agent, containerName }) {
  return changeContainerState({
    lxdEndpoint,
    agent,
    containerName,
    action: 'restart',
  })
}

module.exports = {
  start,
  stop,
  restart,
}
