import axios from 'axios';


const API_URL = import.meta.env.VITE_LOCATION_URL;

export const saveLocation = async (form, multiOptions) => {
  const now = new Date().toISOString().split('T')[0];

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
    cls: form.activityType,
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
};
