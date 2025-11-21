import axios from 'axios'


const DEFAULT_API_URL = import.meta.env.VITE_OBJECT_URL;  
const LOCATION_API_URL = import.meta.env.VITE_LOCATION_URL;  

async function postRequest(method, params, apiUrl = DEFAULT_API_URL) {
  try {
    const response = await axios.post(apiUrl, {
      method,
      params,
    })
    return response.data.result?.records || []
  } catch (error) {
    console.error(`Ошибка при запросе ${method}:`, error.response?.data || error.message)
    return []
  }
}

export async function fetchParentDepartments() {
  return await postRequest('data/loadObjForSelect', ['Typ_Location'], LOCATION_API_URL)
}

export async function fetchActivityTypes() {
  return await postRequest('data/loadClsForSelect', ['Typ_Location'], LOCATION_API_URL)
}

export async function fetchRegions() {
  return await postRequest('data/loadFactorValForSelect', ['Prop_Region'])
}

export async function fetchActiveOptions() {
  return await postRequest('data/loadFactorValForSelect', ['Prop_IsActive'])
}

export const loadTypes = async () => {
  try {
    const response = await axios.post(DEFAULT_API_URL, {
      method: 'data/loadObjList',
      params: ['Typ_ObjectTyp', 'Prop_ObjectTypeMulti', 'nsidata'],
    });
    return response.data?.result?.records.map(option => ({
      label: option.name,
      value: option.id,
      cls: option.cls, 
      pv: option.pv      
    })) || [];
  } catch (error) {
    console.error('Ошибка загрузки видов объектов:', error);
    throw error;
  }
};
