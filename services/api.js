import axios from 'axios'

const api = axios.create({
  baseURL: 'https://nexfood.lizanimiranda.com.br/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api