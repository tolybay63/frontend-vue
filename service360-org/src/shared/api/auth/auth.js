import axios from "axios";

export async function login(username, password) {
  try {
    const response = await axios.get(`/auth/login`, {
      params: { username, password },
      withCredentials: true,
    });

    const data = response.data;

    if (data?.error || data?.success === false) {
      throw new Error(data.error || "Ошибка авторизации");
    }

    return data;
  } catch (error) {
    console.error("Ошибка в login:", error?.response?.data || error.message);
    throw error;
  }
}

export async function getCurrentUser() {
  const response = await axios.post(
    `/userapi`,
    {
      method: "data/getCurUserInfo",
      params: [],
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
}

export async function getPersonnalInfo(userId) {
  try {
    const response = await axios.post(
      `/userinfo`,
      {
        method: "data/getPersonnalInfo",
        params: [userId],
      },
      {
        withCredentials: true,
      }
    );

    return response.data.result;
  } catch (err) {
    console.error("Ошибка в getPersonnalInfo:", err.response?.data || err.message);
    throw err;
  }
}

export function isAuthenticated() {
  const userAuth = localStorage.getItem('userAuth')
  const curUser = localStorage.getItem('curUser')

  return !!(userAuth && curUser)
}

export function logout() {

  localStorage.removeItem('userAuth')
  localStorage.removeItem('curUser')
  localStorage.removeItem('personnalInfo')
  localStorage.removeItem('objLocation')
  localStorage.removeItem('userId')
  localStorage.removeItem('user')
  localStorage.removeItem('authToken')

  import('@/shared/api/common/userCache').then(module => {
    module.clearUserCache()
  })
}