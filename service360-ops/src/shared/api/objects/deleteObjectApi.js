import axios from 'axios';

const API_URL = import.meta.env.VITE_OBJECT_URL;

const deleteObject = async (objectId) => {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/deleteObjWithProperties',
      params: [objectId],
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении объекта:', error);
    throw error;
  }
};

export { deleteObject };
