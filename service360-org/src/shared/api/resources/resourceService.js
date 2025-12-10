import axios from 'axios'
import { formatDate, formatDateForBackend } from '../common/formatters'
import { getUserData } from '../common/userCache'

const API_RESOURCE_URL = import.meta.env.VITE_RESOURCE_URL;
const OBJECT_URL = import.meta.env.VITE_OBJECT_URL;
const API_NSI_URL = import.meta.env.VITE_NSI_URL;

export async function loadTools({ page = 1, limit = 10 }) {
  const response = await axios.post(API_RESOURCE_URL, {
    method: 'data/loadTool',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      number: item.Number || '',
      name: item.name || '',
      nameTypTool: item.nameTypTool || '',
      nameLocationClsSection: item.nameLocationClsSection || '',
      createdAt: formatDate(item.CreatedAt),
      updatedAt: formatDate(item.UpdatedAt),
      fullNameUser: item.fullNameUser || '',

      idNumber: item.idNumber,
      idTypTool: item.idTypTool,
      fvTypTool: item.fvTypTool,
      pvTypTool: item.pvTypTool,
      idLocationClsSection: item.idLocationClsSection,
      pvLocationClsSection: item.pvLocationClsSection,
      objLocationClsSection: item.objLocationClsSection,
      idCreatedAt: item.idCreatedAt,
      idUpdatedAt: item.idUpdatedAt,
      idUser: item.idUser,
      pvUser: item.pvUser,
      objUser: item.objUser,

      // Для мобильной версии
      date: item.CreatedAt,
      coordinates: item.nameLocationClsSection || '',

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function loadEquipment({ page = 1, limit = 10 }) {
  const response = await axios.post(API_RESOURCE_URL, {
    method: 'data/loadEquipment',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      number: item.Number || '',
      name: item.name || '',
      nameTypEquipment: item.nameTypEquipment || '',
      nameLocationClsSection: item.nameLocationClsSection || '',
      createdAt: formatDate(item.CreatedAt),
      updatedAt: formatDate(item.UpdatedAt),
      fullNameUser: item.fullNameUser || '',

      // ID полей для возможного редактирования
      idNumber: item.idNumber,
      idTypEquipment: item.idTypEquipment,
      fvTypEquipment: item.fvTypEquipment,
      pvTypEquipment: item.pvTypEquipment,
      idLocationClsSection: item.idLocationClsSection,
      pvLocationClsSection: item.pvLocationClsSection,
      objLocationClsSection: item.objLocationClsSection,
      idCreatedAt: item.idCreatedAt,
      idUpdatedAt: item.idUpdatedAt,
      idUser: item.idUser,
      pvUser: item.pvUser,
      objUser: item.objUser,

      // Для мобильной версии
      date: item.CreatedAt,
      coordinates: item.nameLocationClsSection || '',

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function loadToolTypes() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_TypTool']
    });

    const records = response.data.result?.records || [];
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
      factor: record.factor
    }));
  } catch (error) {
    console.error('Ошибка при загрузке типов инструментов:', error);
    throw error;
  }
}

export async function loadSections() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Location', 'Prop_LocationClsSection', 'orgstructuredata']
    });

    const records = response.data.result?.records || [];
    return records.map(record => ({
      label: record.fullName || record.name,
      value: record.id,
      cls: record.cls,
      pv: record.pv
    }));
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error);
    throw error;
  }
}

export async function loadEquipmentTypes() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_TypEquipment']
    });

    const records = response.data.result?.records || [];
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
      factor: record.factor
    }));
  } catch (error) {
    console.error('Ошибка при загрузке типов техники:', error);
    throw error;
  }
}

export async function saveTool(toolData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      Number: toolData.inventoryNumber,
      name: toolData.name,
      fvTypTool: toolData.toolType.value,
      pvTypTool: toolData.toolType.pv,
      objLocationClsSection: toolData.section.value,
      pvLocationClsSection: toolData.section.pv,
      objUser: user.id,
      pvUser: user.pv,
      CreatedAt: today,
      UpdatedAt: today,
      Description: toolData.description || ''
    };

    console.log('Отправка данных для сохранения инструмента:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveTool',
      params: ['ins', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при сохранении инструмента:', error);
    throw error;
  }
}

export async function saveEquipment(equipmentData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      Number: equipmentData.inventoryNumber,
      name: equipmentData.name,
      fvTypEquipment: equipmentData.equipmentType.value,
      pvTypEquipment: equipmentData.equipmentType.pv,
      objLocationClsSection: equipmentData.section.value,
      pvLocationClsSection: equipmentData.section.pv,
      objUser: user.id,
      pvUser: user.pv,
      CreatedAt: today,
      UpdatedAt: today,
      Description: equipmentData.description || ''
    };

    console.log('Отправка данных для сохранения техники:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveEquipment',
      params: ['ins', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при сохранении техники:', error);
    throw error;
  }
}

export async function updateTool(toolData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      id: toolData.rawData.id,
      cls: toolData.rawData.cls,
      name: toolData.name,
      idNumber: toolData.rawData.idNumber,
      Number: toolData.inventoryNumber,
      idTypTool: toolData.rawData.idTypTool,
      fvTypTool: toolData.toolType.value,
      pvTypTool: toolData.toolType.pv,
      idLocationClsSection: toolData.rawData.idLocationClsSection,
      pvLocationClsSection: toolData.section.pv,
      objLocationClsSection: toolData.section.value,
      idUpdatedAt: toolData.rawData.idUpdatedAt,
      UpdatedAt: today,
      idUser: toolData.rawData.idUser,
      pvUser: user.pv,
      objUser: user.id,
      idDescription: toolData.rawData.idDescription,
      Description: toolData.description || ''
    };

    console.log('Отправка данных для обновления инструмента:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveTool',
      params: ['upd', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении инструмента:', error);
    throw error;
  }
}

export async function updateEquipment(equipmentData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      id: equipmentData.rawData.id,
      cls: equipmentData.rawData.cls,
      name: equipmentData.name,
      idNumber: equipmentData.rawData.idNumber,
      Number: equipmentData.inventoryNumber,
      idTypEquipment: equipmentData.rawData.idTypEquipment,
      fvTypEquipment: equipmentData.equipmentType.value,
      pvTypEquipment: equipmentData.equipmentType.pv,
      idLocationClsSection: equipmentData.rawData.idLocationClsSection,
      pvLocationClsSection: equipmentData.section.pv,
      objLocationClsSection: equipmentData.section.value,
      idUpdatedAt: equipmentData.rawData.idUpdatedAt,
      UpdatedAt: today,
      idUser: equipmentData.rawData.idUser,
      pvUser: user.pv,
      objUser: user.id,
      idDescription: equipmentData.rawData.idDescription,
      Description: equipmentData.description || ''
    };

    console.log('Отправка данных для обновления техники:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveEquipment',
      params: ['upd', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении техники:', error);
    throw error;
  }
}

export async function loadMaterials({ page = 1, limit = 10 }) {
  const response = await axios.post(API_RESOURCE_URL, {
    method: 'data/loadMaterial',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      fullName: item.fullName || '',
      nameMeasure: item.nameMeasure || '',

      // Дополнительные поля для возможного редактирования
      name: item.name || '',
      idMeasure: item.idMeasure,
      pvMeasure: item.pvMeasure,
      meaMeasure: item.meaMeasure,

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function loadTpServices({ page = 1, limit = 10 }) {
  const response = await axios.post(API_RESOURCE_URL, {
    method: 'data/loadTpService',
    params: [0]
  })

  const records = response.data.result?.records || []

  return {
    data: records.map((item, i) => ({
      rawData: item,
      id: item.id,
      cls: item.cls,
      name: item.name || '',
      fullName: item.fullName || '',
      nameMeasure: item.nameMeasure || '',

      _originalIndex: i + 1,
    })),
    total: records.length
  }
}

export async function loadMeasures() {
  try {
    const response = await axios.post(API_NSI_URL, {
      method: 'data/loadMeasure',
      params: ['Prop_Measure']
    });

    const records = response.data.result?.records || [];
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv
    }));
  } catch (error) {
    console.error('Ошибка при загрузке единиц измерения:', error);
    throw error;
  }
}

export async function saveMaterial(materialData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      name: materialData.name,
      meaMeasure: materialData.measure.value,
      pvMeasure: materialData.measure.pv,
      objUser: user.id,
      pvUser: user.pv,
      CreatedAt: today,
      UpdatedAt: today,
      Description: materialData.description || ''
    };

    console.log('Отправка данных для сохранения материала:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveMaterial',
      params: ['ins', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при сохранении материала:', error);
    throw error;
  }
}

export async function saveTpService(serviceData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      name: serviceData.name,
      meaMeasure: serviceData.measure.value,
      pvMeasure: serviceData.measure.pv,
      objUser: user.id,
      pvUser: user.pv,
      CreatedAt: today,
      UpdatedAt: today,
      Description: serviceData.description || ''
    };

    console.log('Отправка данных для сохранения услуги:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveTpService',
      params: ['ins', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при сохранении услуги:', error);
    throw error;
  }
}

export async function updateMaterial(materialData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      id: materialData.rawData.id,
      cls: materialData.rawData.cls,
      name: materialData.name,
      idMeasure: materialData.rawData.idMeasure,
      meaMeasure: materialData.measure.value,
      pvMeasure: materialData.measure.pv,
      idUpdatedAt: materialData.rawData.idUpdatedAt,
      UpdatedAt: today,
      idUser: materialData.rawData.idUser,
      pvUser: user.pv,
      objUser: user.id,
      idDescription: materialData.rawData.idDescription,
      Description: materialData.description || ''
    };

    console.log('Отправка данных для обновления материала:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveMaterial',
      params: ['upd', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении материала:', error);
    throw error;
  }
}

export async function updateTpService(serviceData) {
  try {
    const user = await getUserData();
    const today = formatDateForBackend(new Date());

    const payload = {
      id: serviceData.rawData.id,
      cls: serviceData.rawData.cls,
      name: serviceData.name,
      idMeasure: serviceData.rawData.idMeasure,
      meaMeasure: serviceData.measure.value,
      pvMeasure: serviceData.measure.pv,
      idUpdatedAt: serviceData.rawData.idUpdatedAt,
      UpdatedAt: today,
      idUser: serviceData.rawData.idUser,
      pvUser: user.pv,
      objUser: user.id,
      idDescription: serviceData.rawData.idDescription,
      Description: serviceData.description || ''
    };

    console.log('Отправка данных для обновления услуги:', payload);

    const response = await axios.post(API_RESOURCE_URL, {
      method: 'data/saveTpService',
      params: ['upd', payload]
    });

    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении услуги:', error);
    throw error;
  }
}

