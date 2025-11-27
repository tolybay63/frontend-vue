import axios from 'axios'
import { formatDateForBackend } from '../common/formatters'

const API_URL = import.meta.env.VITE_LOCATION_URL;

export async function loadLocation() {
  try {
    console.log('📡 Отправка запроса на сервер...');
    const response = await axios.post(API_URL, {
      method: 'data/loadLocation',
      params: [0]
    });
    console.log('📬 Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка при загрузке локаций:', error);
    throw error;
  }
}

export async function saveLocation(form, multiOptions) {
  const now = formatDateForBackend(new Date());

  const multiObjects = form.multipleSelect.map(id => {
    const match = multiOptions.find(opt => opt.value === id);
    return {
      id: match?.value,
      cls: match?.cls,
      name: match?.label,
      pv: match?.pv,
    };
  });

  const payload = {
    name: form.name,
    cls: form.activityType?.value || form.activityType,
    parent: form.parent?.value || null,
    Address: form.address,
    Phone: form.phone,
    objObjectTypeMulti: multiObjects,
    StartKm: form.coordinates.coordStartKm,
    FinishKm: form.coordinates.coordEndKm,
    StageLength: form.distance === 'Неверные данные' ? 0 : Number(form.distance),
    fvRegion: form.region?.id,
    pvRegion: form.region?.pv,
    fvIsActive: form.active?.id,
    pvIsActive: form.active?.pv,
    CreatedAt: now,
    UpdatedAt: now,
    Description: form.description,
  };

  console.log('Payload:', payload);

  try {
    const response = await axios.post(API_URL, {
      method: 'data/saveLocation',
      params: ['ins', payload],
    });

    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error during saveLocation request:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateLocation(form, multiOptions) {
  const now = formatDateForBackend(new Date());
  const raw = form.rawData;

  const multiObjects = form.multipleSelect.map(id => {
    const match = multiOptions.find(opt => opt.value === id);
    return {
      id: match?.value,
      cls: match?.cls,
      name: match?.label,
      pv: match?.pv,
    };
  });

  const payload = {
    id: raw.id,
    cls: raw.cls,
    name: form.name,
    parent: form.parent?.value || raw.parent || null,
    idAddress: raw.idAddress,
    Address: form.address || '',
    idPhone: raw.idPhone,
    Phone: form.phone || '',
    objObjectTypeMulti: multiObjects,
    idStartKm: raw.idStartKm,
    StartKm: form.coordinates.coordStartKm || null,
    idFinishKm: raw.idFinishKm,
    FinishKm: form.coordinates.coordEndKm || null,
    idStageLength: raw.idStageLength,
    StageLength: form.distance === 'Неверные данные' ? 0 : Number(form.distance) || 0,
    idRegion: raw.idRegion,
    fvRegion: form.region?.id,
    pvRegion: form.region?.pv,
    idIsActive: raw.idIsActive,
    fvIsActive: form.active?.id,
    pvIsActive: form.active?.pv,
    idDescription: raw.idDescription,
    Description: form.description || '',
    idCreatedAt: raw.idCreatedAt,
    CreatedAt: raw.CreatedAt || '',
    idUpdatedAt: raw.idUpdatedAt,
    UpdatedAt: now,
  };

  console.log('Update Payload:', payload);

  try {
    const response = await axios.post(API_URL, {
      method: 'data/saveLocation',
      params: ['upd', payload],
    });

    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error during updateLocation request:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteLocation(id) {
  try {
    console.log('Отправка запроса на удаление организационной структуры:', { id })

    const response = await axios.post(API_URL, {
      method: 'data/deleteObjWithProperties',
      params: [id]
    })

    console.log('Ответ от сервера:', response.data)
    return response.data
  } catch (error) {
    console.error('Ошибка при удалении организационной структуры:', error)
    throw error
  }
}

