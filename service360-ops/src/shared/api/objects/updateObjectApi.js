import axios from 'axios';


const API_URL = import.meta.env.VITE_OBJECT_URL;


export const deleteObject = async (objectId) => {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/deleteObjWithProperties',
      params: [objectId],
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateObjectServed = async (payload) => {
  try {
    const response = await axios.post(API_URL, {
      method: 'data/saveObjectServed',
      params: ['upd', payload],
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};