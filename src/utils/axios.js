import axios from 'axios'

axios.create({
    baseURL:'/', //基础路径，发送请求路径的前缀
    timeout:5000 //超时时间
})


//请求拦截器
axios.interceptors.request.use(function(config){
    config.headers['token'] = JSON.parse(localStorage.getItem('userInfo')) ? JSON.parse(localStorage.getItem('userInfo')).token : ''
    return config;
},
function(error){
    return Promise.reject(error)
}) 



//响应拦截器
axios.interceptors.response.use(function(response){
    return response.data;
},
function(error){
    return Promise.reject(error)
})  

export default axios