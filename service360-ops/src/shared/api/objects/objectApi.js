// src/api/objectApi.js
import axios from 'axios'

const API_URL = import.meta.env.VITE_OBJECT_URL

export async function loadTypes() {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/loadObjList',
      params: ['Typ_ObjectTyp', 'Prop_ObjectType', 'nsidata'],
    })
    const records = response.data?.result?.records || []
    return records.map(item => ({
      label: item.name,
      value: item.id,
      cls: item.cls,
      pv: item.pv,
    }))
  } catch (error) {
    return []
  }
}

export async function fetchStationOfCoord(coords) {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/findStationOfCoord',
      params: [coords],
    })
    return response.data
  } catch (error) {
    return null
  }
}

export async function loadSides() {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_Side'],
    })
    const records = response.data?.result?.records || []
    return records.map(item => ({
      label: item.name,
      value: item.id,
      pv: item.pv,
      factor: item.factor,
    }))
  } catch (error) {
    return []
  }
}

export async function saveObjectServed(payload) {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/saveObjectServed',
      params: ['ins', payload],
    })
    return response.data
  } catch (error) {
    throw error
  }
}
