import axios from "axios";

const axiosAuthInstance = axios.create({
  baseURL: import.meta.env.VITE_NSI_URL || import.meta.env.VITE_AUTH_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

export default axiosAuthInstance;
