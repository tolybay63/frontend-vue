import axios from 'axios'

const API_URL = import.meta.env.VITE_OBJECT_URL;

export async function loadObjList(className, propName, sourceName = "nsidata") {
  const response = await axios.post(API_URL, {
    method: 'data/loadObjList',
    params: [className, propName, sourceName]
  })

  const records = response.data.result?.records || []
  return records.map(item => ({
    id: item.id,
    name: item.name,
    cls: item.cls,
    pv: item.pv
  }))
}
