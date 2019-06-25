const {
  VlabUser,
  Vlab,
  Vm,
  VmVlab,
  VmUser,
  Sip,
  SipVlab,
  SipUser,
  Url,
  UrlVlab,
  UrlUser
} = require('../../models')
const _ = require('lodash')
const openneb = require('../../opennebula/openneb')

module.exports = {
  async index(req, res) {
    try {
      const UserId = req.user.id
      const { VlabId } = req.query
      const where = {
        UserId: UserId
      }
      if (VlabId) {
        where.VlabId = VlabId
      }
      const vlabusers = await VlabUser.findAll({
        where: where,
        include: [
          {
            model: Vlab
          }
        ]
      })
        .map(vlabuser => vlabuser.toJSON())
        .map(vlabuser => _.extend(
          {},
          vlabuser.Vlab,
          vlabuser
        ))
      res.send(vlabusers)
    } catch (err) {
      res.status(500).send({
        err: 'An error has occured while trying to get the Vlab User'
      })
    }
  },
  async getVlabUser(req, res) {
    try {
      const vlabuser = await VlabUser.findByPk(req.params.vlabId)
      if (!vlabuser) {
        return res.status(403).send({
          error: 'The vlabuser does not exist'
        })
      }
      res.send(vlabuser)
    } catch (err) {
      res.status(500).send({
        err: 'An error has occured while trying to get the vlabuser'
      })
    }
  },
  async post(req, res) {
    try {
      const { UserId } = req.body
      const { VlabId } = req.body
      const vlabuser = await VlabUser.findOne({
        where: {
          VlabId: VlabId,
          UserId: UserId
        }
      })
      if (vlabuser) {
        return res.status(400).send({
          error: 'this user already have a this vlab'
        })
      }
      const newVlabUser = await VlabUser.create({
        VlabId: VlabId,
        UserId: UserId
      })
      await VmVlab.findAll({ // FOR THE VM ASSIGN
        where: {
          VlabId: VlabId
        }
      }).then(async (vmvlabs) => {
        vmvlabs.forEach(async (vmvlab) => {
          await Vm.findAll({
            where: {
              id: vmvlab.VmId
            }
          }).then(async (vms) => {
            vms.forEach(async (vm) => {
              const isvm = await VmUser.findOne({
                where: {
                  UserId: UserId,
                  VmId: vm.id
                }
              })
              if (!isvm) {
                await VmUser.create({
                  UserId: UserId,
                  VmId: vm.id
                })
              }
            })
          })
        })
      })
      await SipVlab.findAll({ // FOR THE SIP ASSIGN
        where: {
          VlabId: VlabId
        }
      }).then(async (sipvlabs) => {
        sipvlabs.forEach(async (sipvlab) => {
          await Sip.findAll({
            where: {
              id: sipvlab.SipId
            }
          }).then(async (sips) => {
            sips.forEach(async (sip) => {
              const issip = await SipUser.findOne({
                where: {
                  UserId: UserId,
                  sipId: sip.id
                }
              })
              if (!issip) {
                await SipUser.create({
                  UserId: UserId,
                  SipId: sip.id
                })
              }
            })
          })
        })
      })
      await UrlVlab.findAll({ // FOR THE URL ASSIGN
        where: {
          VlabId: VlabId
        }
      }).then(async (urlvlabs) => {
        urlvlabs.forEach(async (urlvlab) => {
          await Url.findAll({
            where: {
              id: urlvlab.UrlId
            }
          }).then(async (urls) => {
            urls.forEach(async (url) => {
              const isurl = await UrlUser.findOne({
                where: {
                  UserId: UserId,
                  urlId: url.id
                }
              })
              if (!isurl) {
                await UrlUser.create({
                  UserId: UserId,
                  UrlId: url.id
                })
              }
            })
          })
        })
      })
      res.send(newVlabUser)
    } catch (err) {
      res.status(500).send({
        err: 'An error has occured while trying to create the Vlab User'
      })
    }
  },
  async delete(req, res) {
    try {
      const { vlabuserId } = req.params
      const vlabuser = await VlabUser.findOne({
        where: {
          id: vlabuserId
        }
      })
      if (!vlabuser) {
        return res.status(403).send({
          error: 'you do not have access to this vlabuser'
        })
      }
      await VmVlab.findAll({ // FOR THE VM DEASSIGN
        where: {
          VlabId: vlabuser.VlabId
        }
      }).then(async (vmvlabs) => {
        vmvlabs.forEach(async (vmvlab) => {
          await Vm.findAll({
            where: {
              id: vmvlab.VmId
            }
          }).then(async (vms) => {
            vms.forEach(async (vm) => {
              const isvm = await VmUser.findOne({
                where: {
                  UserId: vlabuser.UserId,
                  VmId: vm.id
                }
              })
              if (isvm) {
                await isvm.destroy()
              }
            })
          })
        })
      })
      await SipVlab.findAll({ // FOR THE SIP DEASSIGN
        where: {
          VlabId: vlabuser.VlabId
        }
      }).then(async (sipvlabs) => {
        sipvlabs.forEach(async (sipvlab) => {
          await Sip.findAll({
            where: {
              id: sipvlab.SipId
            }
          }).then(async (sips) => {
            sips.forEach(async (sip) => {
              const issip = await SipUser.findOne({
                where: {
                  UserId: vlabuser.UserId,
                  sipId: sip.id
                }
              })
              if (issip) {
                await issip.destroy()
              }
            })
          })
        })
      })
      await UrlVlab.findAll({ // FOR THE URL DEASSIGN
        where: {
          VlabId: vlabuser.VlabId
        }
      }).then(async (urlvlabs) => {
        urlvlabs.forEach(async (urlvlab) => {
          await Url.findAll({
            where: {
              id: urlvlab.UrlId
            }
          }).then(async (urls) => {
            urls.forEach(async (url) => {
              const isurl = await UrlUser.findOne({
                where: {
                  UserId: vlabuser.UserId,
                  urlId: url.id
                }
              })
              if (isurl) {
                await isurl.destroy()
              }
            })
          })
        })
      })
      await vlabuser.destroy()
      res.send(vlabuser)
    } catch (err) {
      res.status(500).send({
        err: 'An error has occured while trying to delete the Vlab User'
      })
    }
  }
}