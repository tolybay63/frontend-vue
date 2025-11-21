import axios from 'axios'

const API_URL = import.meta.env.VITE_OBJECT_URL;

async function loadObjectTypes() {
  const response = await axios.post(API_URL, {
    method: 'data/loadObjList',
    params: ["Typ_ObjectTyp", "Prop_ObjectType", "nsidata"]
  })

  const records = response.data.result?.records || []
  return records.map(item => ({
    id: item.id,
    name: item.name,
    cls: item.cls
  }))
}

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
      rawData: item, // Добавляем исходные данные
      id: item.id,
      cls: item.cls,
      type: typeMap[item.objObjectType] || 'Неизвестно',
      name: item.name || '',
      coords: `${item.StartKm} км ${item.StartPicket} пк - ${item.FinishKm} км ${item.FinishPicket} пк`,
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
      idCreatedAt: item.idCreatedAt,
      idUpdatedAt: item.idUpdatedAt,
      idPeriodicityReplacement: item.idPeriodicityReplacement,
      idSide: item.idSide,
      idSpecs: item.idSpecs,
      idLocationDetails: item.idLocationDetails,
      idNumber: item.idNumber,
      idInstallationDate: item.idInstallationDate,
      idDescription: item.idDescription,

      _originalIndex: i + 1, 
    })),
    total: records.length
  }
}

function formatDate(date) {
  if (!date) return null;

  const parsedDate = new Date(date);
  if (isNaN(parsedDate)) return null;

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();

  return `${day}.${month}.${year}`;
}