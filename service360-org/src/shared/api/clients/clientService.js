import axios from 'axios'

const API_CLIENT_URL = import.meta.env.VITE_CLIENT_URL;

export async function loadClients({ page = 1, limit = 10 }) {
  const response = await axios.post(API_CLIENT_URL, {
    method: 'data/loadClient',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      name: item.name || '',
      bin: item.BIN || '',
      contactPerson: item.ContactPerson || '',
      contactDetails: item.ContactDetails || '',
      description: item.Description || '',

      // ID полей для возможного редактирования
      idBIN: item.idBIN,
      idContactPerson: item.idContactPerson,
      idContactDetails: item.idContactDetails,
      idDescription: item.idDescription,

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function saveClient(clientData) {
  try {
    const payload = {
      name: clientData.name,
      BIN: clientData.bin,
      ContactPerson: clientData.contactPerson,
      ContactDetails: clientData.contactDetails,
      Description: clientData.description || ''
    };

    console.log('Отправка данных для сохранения клиента:', payload);

    const response = await axios.post(API_CLIENT_URL, {
      method: 'data/saveClient',
      params: ['ins', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при сохранении клиента:', error);
    throw error;
  }
}

export async function updateClient(clientData) {
  try {
    const payload = {
      id: clientData.rawData.id,
      cls: clientData.rawData.cls,
      name: clientData.name,
      idBIN: clientData.rawData.idBIN,
      BIN: clientData.bin,
      idContactPerson: clientData.rawData.idContactPerson,
      ContactPerson: clientData.contactPerson,
      idContactDetails: clientData.rawData.idContactDetails,
      ContactDetails: clientData.contactDetails,
      idDescription: clientData.rawData.idDescription,
      Description: clientData.description || ''
    };

    console.log('Отправка данных для обновления клиента:', payload);

    const response = await axios.post(API_CLIENT_URL, {
      method: 'data/saveClient',
      params: ['upd', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении клиента:', error);
    throw error;
  }
}

export async function deleteClient(clientId) {
  try {
    console.log('Отправка данных для удаления клиента:', clientId);

    const response = await axios.post(API_CLIENT_URL, {
      method: 'data/deleteObjWithProperties',
      params: [clientId]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении клиента:', error);
    throw error;
  }
}