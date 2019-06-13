const Opennebula = require('opennebula')
const one = new Opennebula('geoffroy:2961Sailaan1992!',
  'http://vlab.ale-aapp.com:2633/RPC2')
const {
  sequelize,
  User, // NO CARE
  UserOpenNebula,
  UserUserOn,
  Vlab,
  VlabUser,
  Url,
  UrlUser,
  UrlVlab,
  Vm,
  VmUser,
  VmVlab,
  Sip,
  SipUser,
  SipVlab
} = require('./models')
const Promise = require('bluebird')

const getInfoVms = async () => {
  try {
    await one.getVMs((err, data) => {
      const jsonDataVm = JSON.parse(JSON.stringify(data))
      sequelize.sync().then(async () => {
        await Promise.all(
          jsonDataVm.map(vm => {
            // console.log(vm)
            const isVM = vm.NAME.search('VLAB')
            if (isVM != -1) {
              let state = false;
              if (vm.STATE == 3) { // STATE == 3 => RUNNING
                state = true
              }
              const typeIndex = vm.NAME.indexOf('-') // Getting name of the type of device (O2G / OXE / OMS)
              const typeName = vm.NAME.substring(typeIndex + 2)
              const realName = vm.NAME.substring(0, typeIndex - 1) // Getting only name of vlab without type
              const newVm = {
                idopennebula: vm.ID,
                ownername: vm.UNAME,
                groupname: vm.GNAME,
                name: realName,
                active: state,
                type: typeName
              }
              Vm.findOne({
                where: {
                  idopennebula: newVm.idopennebula
                }
              }).then(async vm => {
                if (!vm) {
                  await Vm.create(newVm)
                }
              })
            }
          })
        )
      })
    }, null, 0, 0, null)
  } catch (err) {
    console.log(err)
  }
}

// USER != Vm BUT THEY ARE LINK
const getInfoUsers = async () => {
  try {
    await one.getUsers((err, data) => {
      const jsonDataUser = JSON.parse(JSON.stringify(data))
      sequelize.sync().then(async function () {
        await Promise.all(
          jsonDataUser.map(user => {
            // console.log(user)
            const newUser = {
              idopennebula: user.ID,
              groupname: user.GNAME,
              username: user.NAME,
              password: user.PASSWORD,
              tokenpwd: user.TEMPLATE.TOKEN_PASSWORD
            }
            UserOpenNebula.findOne({
              where: {
                idopennebula: newUser.idopennebula
              }
            }).then(async user => {
              if (!user) {
                let userOn = await UserOpenNebula.create(newUser)
                let userSandbox = await User.findAll({
                  where: {
                    admin: false
                  }
                })
                for (var i = 0; i != userSandbox.length; i++) {
                  if (userSandbox[i].username === userOn.username) {
                    let useruserOn = await UserUserOn.findOne({
                      where: {
                        UserId: userSandbox[i].id,
                        UserOpenNebulaId: userOn.id
                      }
                    })
                    if (!useruserOn) {
                      await UserUserOn.create({
                        UserId: userSandbox[i].id,
                        UserOpenNebulaId: userOn.id
                      })
                    }
                  }
                }

              }
            })
          })
        )
      })
    })
  } catch (err) {
    console.log(err)
  }
}

// TODO : USER lINK TO SIP URL VLAB VM (IF ALREADY EXIST LINK TO)
const getInfoVNets = async () => {
  try {
    await one.getVNets((err, data) => {
      const jsonDataVnet = JSON.parse(JSON.stringify(data))
      sequelize.sync().then(async function () {
        await Promise.all(
          jsonDataVnet.map(vlab => {
            const isVlab = vlab.NAME.search('ADMIN') // Only get VLAB
            if (isVlab < 0) {
              Vlab.findOne({
                where: {
                  idopennebula: vlab.ID
                }
              }).then(async Vlabs => {
                if (!Vlabs) {
                  const typeIndex = vlab.NAME.indexOf('-') // Getting name of the type of device (O2G / OXE / OMS)
                  await Vlab.create({
                    idopennebula: vlab.ID,
                    ownername: vlab.UNAME,
                    groupname: vlab.GNAME,
                    name: vlab.NAME,
                    nameparse: vlab.NAME.substring(0, typeIndex - 1), // Getting only name of vlab without type
                    vlanid: vlab.VLAN_ID
                  })
                }
              })
            }
          })
        )
      }).then(() => {
        Vlab.findAll()
          .then(async (vlab) => {
            let vm = await Vm.findAll()
            for (var i = 0; i != vlab.length; i++) {
              for (var j = 0; j != vm.length; j++) {
                if (vlab[i].nameparse === vm[j].name) {
                  await VmVlab.findOne({
                    where: {
                      VlabId: vlab[i].id,
                      VmId: vm[j].id
                    }
                  }).then(async vmvlab => {
                    if (!vmvlab) {
                      await VmVlab.create({
                        VlabId: vlab[i].id,
                        VmId: vm[j].id
                      })
                    }
                  })
                }
              }
              let tmpUrl = await Url.findOne({
                where: {
                  url: "http://" + vlab[i].nameparse.toLowerCase() + "-ale.aapp"
                }
              })
              if (!tmpUrl) {
                let tmpUrlVnc = await Url.create({
                  name: "VNC Access",
                  url: "http://" + vlab[i].nameparse.toLowerCase() + "-ale.aapp",
                  log: "user",
                  password: "XXXXX", // make random password
                  active: false
                })
                let tmpUrlO2g = await Url.create({
                  name: "O2G Access",
                  url: "https://o2g-vlab50.ale-aapp.com/",
                  log: "admin",
                  password: "XXXXXX", // make random password
                  active: false
                })
                let urlVlab = await UrlVlab.findOne({
                  where: {
                    VlabId: vlab[i].id,
                    UrlId: tmpUrlVnc.id
                  }
                })
                let urlVlabBis = await UrlVlab.findOne({
                  where: {
                    VlabId: vlab[i].id,
                    UrlId: tmpUrlO2g.id
                  }
                })
                if (!urlVlab) {
                  await UrlVlab.create({
                    VlabId: vlab[i].id,
                    UrlId: tmpUrlVnc.id
                  })
                }
                if (!urlVlabBis) {
                  await UrlVlab.create({
                    VlabId: vlab[i].id,
                    UrlId: tmpUrlO2g.id
                  })
                }
              }
              for (var k = 1; k != 6; k++) {
                let sip = await Sip.findOne({
                  where: {
                    name: "100" + k,
                    login: "100" + k,
                    vlabname: vlab[i].nameparse
                  }
                })
                if (!sip) {
                  sip = await Sip.create({
                      name: "100" + k,
                      login: "100" + k,
                      passwd: "XXXX", // make random password when user assign
                      vlabname: vlab[i].nameparse,
                      active: false,
                    })
                }
                let sipVlab = await SipVlab.findOne({
                  where: {
                    VlabId: vlab[i].id,
                    SipId: sip.id
                  }
                })
                if (!sipVlab) {
                  await SipVlab.create({
                    VlabId: vlab[i].id,
                    SipId: sip.id
                  })
                }
              }
              let users = await User.findAll({
                where: {
                  admin: false
                }
              })
              for (var n = 0; n != users.length; n++) {
                if (users[n].username === vlab[i].ownername) {
                  let vlabUser = await VlabUser.findOne({
                    where: {
                      VlabId: vlab[i].id,
                      UserId: users[n].id
                    }
                  })
                  if (!vlabUser) {
                    vlabUser = await VlabUser.create({
                      VlabId: vlab[i].id,
                      UserId: users[n].id
                    })
                    let sipvlabs = await SipVlab.findAll({
                      where: {
                        VlabId: vlab[i].id
                      }
                    })
                    sipvlabs.forEach(async sipvlab => {
                      await SipUser.create({
                        UserId: users[n].id,
                        SipId: sipvlab.SipId
                      })
                    })
                    let urlvlabs = await UrlVlab.findAll({
                      where: {
                        VlabId: vlab[i].id
                      }
                    })
                    urlvlabs.forEach(async urlvlab => {
                      await UrlUser.create({
                        UserId: users[n].id,
                        UrlId: urlvlab.UrlId
                      })
                    })
                    let vmvlabs = await VmVlab.findAll({
                      where: {
                        VlabId: vlab[i].id
                      }
                    })
                    vmvlabs.forEach(async vmvlab => {
                      await VmVlab.create({
                        UserId: users[n].id,
                        VmId: vmvlab.VmId
                      })
                    })
                  }
                }
              }
            }
          })
      })
    }, null, 0, 0)
  } catch (err) {
    console.log(err)
  }
}

const getInfoHosts = async () => {
  try {
    await one.getHosts((err, data) => {
      console.log(data.length)
      const jsonDataHost = JSON.parse(JSON.stringify(data))
      console.log(jsonDataHost[1])
    })
  } catch (err) {
    console.log(err)
  }
}

const getInfoClusters = async () => {
  try {
    await one.getClusters((err, data) => {
      console.log(data.length)
      const jsonDataCluster = JSON.parse(JSON.stringify(data))
      console.log(jsonDataCluster[1])
    })
  } catch (err) {
    console.log(err)
  }
}

const getInfoGroups = async () => {
  try {
    await one.getGroups((err, data) => {
      console.log(data.length)
      const jsonDataGroup = JSON.parse(JSON.stringify(data))
      console.log(jsonDataGroup[1])
    })
  } catch (err) {
    console.log(err)
  }
}

const getInfoTemplates = async () => {
  try {
    await one.getTemplates((err, data) => {
      console.log(data.length)
      const jsonDataTemplate = JSON.parse(JSON.stringify(data))
      console.log(jsonDataTemplate[1])
    }, null, 0, 100)
  } catch (err) {
    console.log(err)
  }
}

const openneb = {
  one: one,
  getInfoVms: getInfoVms,
  getInfoUsers: getInfoUsers,
  getInfoVNets: getInfoVNets,
  getInfoHosts: getInfoHosts,
  getInfoClusters: getInfoClusters,
  getInfoGroups: getInfoGroups,
  getInfoTemplates: getInfoTemplates
}

module.exports = openneb

/******************* USEFULL CMD FOR OPENNEBULA API ***************/
      // const user = one.getUser(14)
      // user.info(function(err, data) {
      //   console.log(data)
      // })
