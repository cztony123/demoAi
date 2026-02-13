import request from '../utils/axios.js'

export function updateImage(data) {
    return request({
        url: '/api/inpaint',
        method: 'post',
        data: data
    });
}