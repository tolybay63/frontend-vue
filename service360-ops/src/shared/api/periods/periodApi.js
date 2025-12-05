import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_OBJECT_URL;

export const loadPeriodTypes = async () => {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        method: 'data/loadPeriodType',
        params: [],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const records = response.data.result.records;

    return records.map(record => ({
      label: record.text,
      value: record.id,
    }));
  } catch (error) {
    console.error('Ошибка при загрузке типов периода:', error);
    throw error;
  }
};
