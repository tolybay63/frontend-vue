import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

export const api = axios.create({
  baseURL,
  timeout: 30000,
})

// простейшие перехватчики
api.interceptors.request.use((config) => {
  // тут можно проставлять токен, если появится
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // на dev просто пробросим ошибку
    return Promise.reject(err)
  },
)
