import axios from 'axios'
import { loadObjList } from '../common/loadObjList'
import { formatDate } from '../common/formatters'

const API_URL = import.meta.env.VITE_OBJECT_URL;

export async function loadTypes() {
  try {
    const records = await loadObjList('Typ_ObjectTyp', 'Prop_ObjectType', 'nsidata')
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

async function loadObjectTypes() {
  return loadObjList("Typ_ObjectTyp", "Prop_ObjectType", "nsidata")
}

const formatCoordinates = (startKm, startPk, startZv, finishKm, finishPk, finishZv) => {
  const isPresent = (val) => val !== null && val !== undefined && val !== '';

  const startPart = [];
  if (isPresent(startKm)) startPart.push(`${startKm}км`);
  if (isPresent(startPk)) startPart.push(`${startPk}пк`);
  if (isPresent(startZv)) startPart.push(`${startZv}зв`);

  const finishPart = [];
  if (isPresent(finishKm)) finishPart.push(`${finishKm}км`);
  if (isPresent(finishPk)) finishPart.push(`${finishPk}пк`);
  if (isPresent(finishZv)) finishPart.push(`${finishZv}зв`);

  const start = startPart.join(' ');
  const finish = finishPart.join(' ');

  if (start && finish) {
    return `${start} - ${finish}`;
  } else if (start) {
    return start;
  }
  return 'Координаты отсутствуют';
};

export async function loadObjectServed({ page = 1, limit = 10 }) {
  const objectTypes = await loadObjectTypes()
  const typeMap = Object.fromEntries(objectTypes.map(t => [t.id, t.name]))

  const response = await axios.post(API_URL, {
    method: 'data/loadObjectServed',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      type: typeMap[item.objObjectType] || 'Неизвестно',
      name: item.name || '',
      coords: formatCoordinates(item.StartKm, item.StartPicket, item.StartLink, item.FinishKm, item.FinishPicket, item.FinishLink),
      feature: item.Specs || '',
      location: item.LocationDetails || '',
      replacement: item.PeriodicityReplacement || '',
      number: item.Number || '',
      installDate: formatDate(item.InstallationDate),
      createDate: formatDate(item.CreatedAt),
      updateDate: formatDate(item.UpdatedAt),
      description: item.Description || '',
      fvSide: item.fvSide,
      objObjectType: item.objObjectType,
      idObjectType: item.idObjectType,
      idSection: item.idSection,
      idStartKm: item.idStartKm,
      idFinishKm: item.idFinishKm,
      idStartPicket: item.idStartPicket,
      idFinishPicket: item.idFinishPicket,
      idStartLink: item.idStartLink,
      idFinishLink: item.idFinishLink,
      idCreatedAt: item.idCreatedAt,
      idUpdatedAt: item.idUpdatedAt,
      idPeriodicityReplacement: item.idPeriodicityReplacement,
      idSide: item.idSide,
      idSpecs: item.idSpecs,
      idLocationDetails: item.idLocationDetails,
      idNumber: item.idNumber,
      idInstallationDate: item.idInstallationDate,
      idDescription: item.idDescription,

      // Для мобильной версии
      nameObjectType: item.nameObjectType || typeMap[item.objObjectType] || '',
      fullName: item.fullName || '',
      coordinates: formatCoordinates(item.StartKm, item.StartPicket, item.StartLink, item.FinishKm, item.FinishPicket, item.FinishLink),
      date: item.CreatedAt,
      nameSection: item.nameSection || '',

      _originalIndex: i + 1,
    })),
    total: records.length
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

export async function updateObjectServed(payload) {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/saveObjectServed',
      params: ['upd', payload],
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export async function deleteObject(objectId) {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/deleteObjWithProperties',
      params: [objectId],
    })
    return response.data
  } catch (error) {
    console.error('Ошибка при удалении объекта:', error)
    throw error
  }
}
