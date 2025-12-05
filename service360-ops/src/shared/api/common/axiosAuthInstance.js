import axios from "axios";

const axiosAuthInstance = axios.create({
  baseURL: "http://192.168.1.20:9177",
  withCredentials: true, 
  headers: {
    "Content-Type": "application/json"
  }
});

export default axiosAuthInstance;
