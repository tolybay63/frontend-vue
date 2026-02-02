import axios from 'axios'

const API_PERSONAL = import.meta.env.VITE_PERSONAL_URL

export async function changePassword(userId, oldPassword, newPassword) {
  const response = await axios.post(
    API_PERSONAL,
    {
      method: 'data/changePasswd',
      params: [userId, oldPassword, newPassword],
    },
    {
      withCredentials: true,
    }
  )

  return response.data
}

export async function forgetPassword(login) {
  const response = await axios.post(
    API_PERSONAL,
    {
      method: 'data/forgetPasswd',
      params: [login],
    },
    {
      withCredentials: true,
    }
  )

  return response.data
}
