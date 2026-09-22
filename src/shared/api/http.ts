import axios from 'axios'
import { getApiBaseUrl } from '../config/env'

export const http = axios.create({
  baseURL: getApiBaseUrl(import.meta.env),
  withCredentials: true,
})
