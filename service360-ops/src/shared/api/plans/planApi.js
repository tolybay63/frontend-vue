import axios from "axios";


const API_BASE_URL = import.meta.env.VITE_PLAN_URL;

export async function loadWorkPlan(date = "2025-07-30", periodType = 11) {
  const objLocation = localStorage.getItem("objLocation");

  if (!objLocation) {
    throw new Error("objLocation не найден в localStorage");
  }

  const response = await axios.post(
    API_BASE_URL, 
    {
      method: "data/loadPlan",
      params: [
        {
          date,
          periodType,
          objLocation: parseInt(objLocation),
        }
      ]
    },
    {
      withCredentials: true
    }
  );

  return response.data.result?.records || [];
}
