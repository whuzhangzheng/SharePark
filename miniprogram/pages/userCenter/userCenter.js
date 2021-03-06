
//index.js
const app = getApp()
const userUtils = require('../../utils/user-utils')

Page({
  data: {
    avatarUrl: '/images/user-unlogin.png',
    nickName:null,
    userInfo: {},
    logged: false,
    // takeSession: false,
    // requestResult: '',
    address: null,
  },

  onLoad: function() {
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }
    wx.authorize({scope: "scope.userLocation", scope:"scope.userInfo"});
  
    wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
            wx.getUserInfo({
              success: res => {
                console.log("userinfo")
                console.log(res)
                this.setData({
                  logged:true,
                  avatarUrl: res.userInfo.avatarUrl,
                  nickName:res.userInfo.nickName,
                  userInfo: res.userInfo
                });
                // 自己的信息添加到全局
                app.globalData.userInfo = res.userInfo;   
              }
            })
            // 如果已经获得了权限，直接获取地理位置
            if (res.authSetting['scope.userLocation']){
              this.onGetLocation()
            }
            // 获取openid
            this.onGetOpenid()
          }
        }
      })
  },

  onGetUserInfo: function(e) {
    // 获取openid或地理信息
    this.onGetOpenidAndLocation();
    // 获取用户信息
    console.log("用户信息")
    console.log(e)
    if (!this.data.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        nickName:e.detail.userInfo.nickName,
        userInfo: e.detail.userInfo
      })
    }
  },
  onGetOpenidAndLocation: function(){
    this.onGetOpenid();
    this.onGetLocation();
  },
  onGetOpenid: function() {
    // 调用云函数
    let that = this;
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        app.globalData.openid = res.result.openid
        userUtils.signin(res.result.openid, that.data.avatarUrl, that.data.nickName)
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        wx.navigateTo({
          url: '../deployFunctions/deployFunctions',
        })
      }
    })
  },
  // 获取地理位置
  onGetLocation: function(){
    let that = this;
    wx.getLocation({
      type: 'wgs84', //wgs84 返回 gps 坐标，gcj02 返回可用于
      isHighAccuracy: true,
      success (res) {
        // console.log(res);
        const latitude = res.latitude
        const longitude = res.longitude
        const accuracy = res.accuracy
        // 构建请求地址
        var qqMapApi = 'https://apis.map.qq.com/ws/geocoder/v1/?location=' + latitude + ','+ longitude + "&key=" + 'QVIBZ-PY3KS-VQZOM-64WJD-5BOFV-EAFSA';
        that.sendRequest(qqMapApi);
      }
     })
  },

  /**
 * 发送请求， 地址逆向解析
 */
sendRequest: function (qqMapApi) {
  let that = this;
  // 调用请求
  wx.request({
    url: qqMapApi,
    data: {},
    method: 'GET',
    success: (res) => {
      if (res.statusCode == 200 && res.data.status == 0) {
        // 从返回值中提取需要的业务地理信息数据
        console.log("逆向解析后的地址信息")
        console.log(res)
        app.globalData.address = {
          province: res.data.result.address_component.province,
          city: res.data.result.address_component.city,
          district: res.data.result.address_component.district,
          street: res.data.result.address_component.street,
          lat: res.data.result.location.lat,
          long: res.data.result.location.lng,
          address: res.data.result.formatted_addresses.recommend
        }
        that.setData({
          address: res.data.result.formatted_addresses.recommend
        })
      }
    }
  })
},

onShow: function(){
  // console.log(this.data.avatarUrl)
}
})
