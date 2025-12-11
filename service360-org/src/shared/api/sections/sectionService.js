import axios from 'axios';
import { loadObjList } from '../common/loadObjList';

const API_URL = import.meta.env.VITE_OBJECT_URL;

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

export async function loadSection({ page = 1, limit = 10 }) {
  const response = await axios.post(API_URL, {
    method: 'data/loadSection',
    params: [0]
  })

  // Данные находятся напрямую в result.records, а не в result.store.records
  const records = response.data.result?.records || []

  console.log('loadSection - raw response:', response.data)
  console.log('loadSection - records:', records)

  const mappedData = records.map((item, i) => ({
    rawData: item,
    id: item.id,
    cls: item.cls,
    name: item.name || '',
    nameClient: item.nameClient || '',
    coords: formatCoordinates(item.StartKm, null, null, item.FinishKm, null, null),
    StageLength: item.StageLength || 0,

    _originalIndex: i + 1,
  }))

  console.log('loadSection - mapped data:', mappedData)

  return {
    data: mappedData,
    total: records.length
  }
}

export async function loadStation({ page = 1, limit = 10 }) {
  const response = await axios.post(API_URL, {
    method: 'data/loadStation',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      name: item.name || '',
      sections: item.nameParent || '',
      coords: formatCoordinates(
        item.StartKm,
        item.StartPicket,
        item.StartLink,
        item.FinishKm,
        item.FinishPicket,
        item.FinishLink
      ),

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function loadStage({ page = 1, limit = 10 }) {
  const response = await axios.post(API_URL, {
    method: 'data/loadStage',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      name: item.name || '',
      sections: item.nameParent || '',
      coords: formatCoordinates(
        item.StartKm,
        item.StartPicket,
        item.StartLink,
        item.FinishKm,
        item.FinishPicket,
        item.FinishLink
      ),
      StageLength: item.StageLength || 0,

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function loadClients() {
  try {
    const records = await loadObjList('Cls_Client', 'Prop_Client', 'clientdata');
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv || null
    }));
  } catch (error) {
    console.error('Ошибка при загрузке клиентов:', error);
    throw error;
  }
}
