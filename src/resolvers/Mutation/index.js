const fetch = require('node-fetch')
const { network, auth } = require('../../os')
const lxd = require('../../lxd')
const { User } = require('../../auth')
const logger = require('../../logger')

async function login(root, args, context, info) {
  return User.login(args.username, args.password)
}

async function changeUsername(root, args, context, info) {
  return User.changeUsername(context, args.newUsername)
}

async function changePassword(root, args, context, info) {
  return User.changePassword(context, args.newPassword, args.newPasswordConfirm)
}

async function createUser(root, args, context, info) {
  User.getUserFromContext(context)
  if (args.password === args.passwordConfirm) {
    return User.create(args.username, args.password)
  } else {
    const errorMessage = 'Password and password confirmation are not the same.'
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

async function deleteUser(root, args, context, info) {
  const user = User.getUserFromContext(context)
  const deletedUser = User.findById(args.id)
  if (deletedUser) {
    await User.delete(args.id)
    return deletedUser
  } else {
    const errorMessage = `User with id ${args.id} does not exist.`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

// OS Mutations

async function createOSUser(root, args, context, info) {
  User.getUserFromContext(context)
  if (args.password === args.passwordConfirm) {
    return auth.createUser(args.username, args.password)
  } else {
    const errorMessage = 'Password and password confirmation are not the same.'
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

async function deleteOSUser(root, args, context, info) {
  User.getUserFromContext(context)
  return auth.deleteUser(args.username)
}

async function addAuthorizedKey(root, args, context, info) {
  return auth.addAuthorizedKey(args.username, args.key)
}

async function deleteAuthorizedKey(root, args, context, info) {
  return auth.deleteAuthorizedKey(args.username, args.line)
}

// Container Mutations
const createContainer = async function (root, args, context, info) {
  const { lxdEndpoint, agent, cloudInitComplete } = context
  await User.getUserFromContext(context)
  const container = await lxd.instances.create({
    lxdEndpoint,
    agent,
    containerName: args.containerName,
    profile: args.profile,
  })
  cloudInitComplete[container.name] = false
  return container
}

const deleteContainer = async function (root, args, context, info) {
  const { lxdEndpoint, agent, cloudInitComplete } = context
  await User.getUserFromContext(context)
  const container = await lxd.instances.drop({
    lxdEndpoint,
    agent,
    containerName: args.containerName,
  })
  cloudInitComplete[container.name] = undefined
  return container
}

const startContainer = async function (root, args, context, info) {
  const { lxdEndpoint, agent } = context
  await User.getUserFromContext(context)
  return lxd.instances.start({
    lxdEndpoint,
    agent,
    containerName: args.containerName,
  })
}

const stopContainer = async function (root, args, context, info) {
  const { lxdEndpoint, agent } = context
  await User.getUserFromContext(context)
  return lxd.instances.stop({
    lxdEndpoint,
    agent,
    containerName: args.containerName,
  })
}

const restartContainer = async function (root, args, context, info) {
  const { lxdEndpoint, agent } = context
  await User.getUserFromContext(context)
  return lxd.instances.restart({
    lxdEndpoint,
    agent,
    containerName: args.containerName,
  })
}

const setDescription = async function (root, args, context, info) {
  const { lxdEndpoint, agent } = context
  await User.getUserFromContext(context)
  await fetch(`${lxdEndpoint}/1.0/instances/${args.containerName}`, {
    method: 'PATCH',
    agent,
    body: JSON.stringify({
      description: args.description,
    }),
  })
  return fetch(`${lxdEndpoint}/1.0/instances/${args.containerName}`, {
    agent,
  })
    .then((result) => result.json())
    .then((data) => data.metadata)
}

const createProfile = async function (root, args, context, info) {
  const { lxdEndpoint, agent } = context
  await User.getUserFromContext(context)
  await fetch(`${lxdEndpoint}/1.0/profiles`, {
    method: 'POST',
    agent,
    body: JSON.stringify({
      name: args.name,
      description: args.description,
      configs: {
        userData: args.userData,
      },
    }),
  })
}

const getCloudInitOutputLog = async function (root, args, context, info) {
  await User.getUserFromContext(context)
  return lxd.cloudInit.getCloudInitOutputLog(args.containerName)
}

const setInterfaceConfig = async function (root, args, context, info) {
  await User.getUserFromContext(context)
  const config = {
    name: args.name,
    dhcp4: args.dhcp,
    addresses: args.addresses,
    gateway4: args.gateway,
  }
  network.setInterfaceConfig(config)
  await new Promise((resolve) => setTimeout(() => resolve(), 2000))
  const ifaces = await network.getInterfaces()
  const defaultRoutes = await network.getDefaultRoutes()
  const iface = ifaces.find((iface) => iface.name === args.name)
  const defaultRoute = defaultRoutes.find(
    (route) => route.interface === iface.name
  )
  return {
    ...iface,
    gateway: defaultRoute ? defaultRoute.gateway : null,
  }
}

module.exports = {
  login,
  changeUsername,
  changePassword,
  createUser,
  deleteUser,
  createOSUser,
  deleteOSUser,
  addAuthorizedKey,
  deleteAuthorizedKey,
  createContainer,
  deleteContainer,
  startContainer,
  stopContainer,
  restartContainer,
  setDescription,
  getCloudInitOutputLog,
  setInterfaceConfig,
}
