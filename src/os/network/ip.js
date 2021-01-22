const { exec } = require('child_process')

const getInterfaces = async function () {
  return new Promise((resolve, reject) => {
    exec('ip addr show', (err, stdout, stderr) => {
      const eth1identifier = `${process.env.ETH1NAME}`
      const eth2identifier = `${process.env.ETH2NAME}`
      const interfaces = stdout
        .split('\n') //split into members by newline
        .filter(String) //Only get valid strings
        .filter((line) => !line.startsWith(' ')) //Filter out the detail lines (they have leading spaces)
        .filter((line) => !line.includes('lo:')) //Filter out the loopback interface
        .filter(
          (line) =>
            line.includes(eth1identifier) || line.includes(eth2identifier)
        ) //Keep only the interfaces with the names set in the environment variables
        .map((line) => {
          const raw = line.trim()
          const fields = raw.split(/\s+/)
          let alias = fields[1].split('@')[0].replace(':', '')
          if (line.includes(eth1identifier)) {
            alias = process.env.ETH1ALIAS
          } else if (line.includes(eth2identifier)) {
            alias = process.env.ETH2ALIAS
          }
          return {
            id: fields[0].replace(':', ''),
            name: fields[1].split('@')[0].replace(':', ''),
            alias,
            mtu: fields[4],
            state: fields[8],
          }
        })
      interfaces.forEach((interface, index) => {
        const ipAddresses = []
        let lineReached = false
        stdout
          .split('\n')
          .filter(String)
          .forEach((line) => {
            if (
              !lineReached &&
              !line.startsWith(' ') &&
              line.includes(interface.name)
            ) {
              lineReached = true
            } else if (
              lineReached &&
              line.startsWith('') &&
              line.includes('inet ')
            ) {
              const fields = line.trim().split(/\s+/)
              ipAddresses.push(fields[1])
            } else if (
              lineReached &&
              line.startsWith('') &&
              line.includes('link/ether')
            ) {
              const fields = line.trim().split(/\s+/)
              interfaces[index].macAddress = fields[1]
            } else if (lineReached && !line.startsWith(' ')) {
              lineReached = false
            }
          })
        interfaces[index].ipAddresses = ipAddresses
      })
      resolve(interfaces)
    })
  })
}

module.exports = {
  getInterfaces,
}
