import axios from 'axios'
import { formatDate, formatDateForBackend } from '../common/formatters'
import { getUserData } from '../common/userCache'

const API_PERSONNEL_URL = import.meta.env.VITE_PERSONAL_URL
const OBJECT_URL = import.meta.env.VITE_OBJECT_URL

export async function loadPersonnel({ page = 1, limit = 10 }) {
  try {
    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/loadPersonnal',
      params: [0]
    })

    const records = response.data.result?.records || []

    return {
      data: records.map((item, i) => ({
        rawData: item,
        id: item.id,
        cls: item.cls,
        tabNumber: item.TabNumber || '',
        fullName: `${item.UserSecondName || ''} ${item.UserFirstName || ''} ${item.UserMiddleName || ''}`.trim(),
        secondName: item.UserSecondName || '',
        firstName: item.UserFirstName || '',
        middleName: item.UserMiddleName || '',
        position: item.namePosition || '',
        location: item.nameLocation || '',
        email: item.UserEmail || '',
        phone: item.UserPhone || '',
        dateBirth: formatDate(item.UserDateBirth),
        dateEmployment: formatDate(item.DateEmployment),
        dateDismissal: item.DateDismissal ? formatDate(item.DateDismissal) : '',
        sex: item.nameUserSex || '',
        login: item.login || '',
        createdAt: formatDate(item.CreatedAt),
        updatedAt: formatDate(item.UpdatedAt),

        // ID полей для возможного редактирования
        idTabNumber: item.idTabNumber,
        idUserSecondName: item.idUserSecondName,
        idUserFirstName: item.idUserFirstName,
        idUserMiddleName: item.idUserMiddleName,
        idUserEmail: item.idUserEmail,
        idUserPhone: item.idUserPhone,
        idUserDateBirth: item.idUserDateBirth,
        idDateEmployment: item.idDateEmployment,
        idDateDismissal: item.idDateDismissal,
        idCreatedAt: item.idCreatedAt,
        idUpdatedAt: item.idUpdatedAt,
        idUserSex: item.idUserSex,
        fvUserSex: item.fvUserSex,
        pvUserSex: item.pvUserSex,
        idPosition: item.idPosition,
        fvPosition: item.fvPosition,
        pvPosition: item.pvPosition,
        idLocation: item.idLocation,
        pvLocation: item.pvLocation,
        objLocation: item.objLocation,

        _originalIndex: i + 1,
      })),
      total: records.length
    }
  } catch (error) {
    console.error('Ошибка при загрузке персонала:', error)
    throw error
  }
}

export async function loadPositions() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_Position']
    })

    const records = response.data.result?.records || []
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
      factor: record.factor
    }))
  } catch (error) {
    console.error('Ошибка при загрузке должностей:', error)
    throw error
  }
}

export async function loadLocations() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Location', 'Prop_Location', 'orgstructuredata']
    })

    const records = response.data.result?.records || []
    return records.map(record => ({
      label: record.fullName || record.name,
      value: record.id,
      cls: record.cls,
      pv: record.pv
    }))
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error)
    throw error
  }
}

export async function loadUserSex() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_UserSex']
    })

    const records = response.data.result?.records || []
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
      factor: record.factor
    }))
  } catch (error) {
    console.error('Ошибка при загрузке справочника пола:', error)
    throw error
  }
}

export async function savePersonnel(personnelData) {
  try {
    const today = formatDateForBackend(new Date())

    const payload = {
      TabNumber: personnelData.tabNumber,
      UserSecondName: personnelData.secondName,
      UserFirstName: personnelData.firstName,
      UserMiddleName: personnelData.middleName,
      login: personnelData.login,
      UserEmail: personnelData.email || '',
      UserPhone: personnelData.phone || '',
      UserDateBirth: personnelData.dateBirth ? formatDateForBackend(new Date(personnelData.dateBirth)) : '',
      DateEmployment: personnelData.dateEmployment ? formatDateForBackend(new Date(personnelData.dateEmployment)) : today,
      fvUserSex: personnelData.sex?.value,
      pvUserSex: personnelData.sex?.pv,
      fvPosition: personnelData.position.value,
      pvPosition: personnelData.position.pv,
      objLocation: personnelData.location.value,
      pvLocation: personnelData.location.pv,
      CreatedAt: today,
      UpdatedAt: today,
    }

    console.log('Отправка данных для сохранения сотрудника:', payload)

    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/savePersonnal',
      params: ['ins', payload]
    })

    console.log('Ответ от сервера:', response.data)
    return response.data
  } catch (error) {
    console.error('Ошибка при сохранении сотрудника:', error)
    throw error
  }
}

export async function updatePersonnel(personnelData) {
  try {
    const today = formatDateForBackend(new Date())

    const payload = {
      id: personnelData.rawData.id,
      cls: personnelData.rawData.cls,
      idTabNumber: personnelData.rawData.idTabNumber,
      TabNumber: personnelData.tabNumber,
      idUserSecondName: personnelData.rawData.idUserSecondName,
      UserSecondName: personnelData.secondName,
      idUserFirstName: personnelData.rawData.idUserFirstName,
      UserFirstName: personnelData.firstName,
      idUserMiddleName: personnelData.rawData.idUserMiddleName,
      UserMiddleName: personnelData.middleName,
      login: personnelData.login,
      idUserEmail: personnelData.rawData.idUserEmail,
      UserEmail: personnelData.email || '',
      idUserPhone: personnelData.rawData.idUserPhone,
      UserPhone: personnelData.phone || '',
      idUserDateBirth: personnelData.rawData.idUserDateBirth,
      UserDateBirth: personnelData.dateBirth ? formatDateForBackend(new Date(personnelData.dateBirth)) : '',
      idDateEmployment: personnelData.rawData.idDateEmployment,
      DateEmployment: personnelData.dateEmployment ? formatDateForBackend(new Date(personnelData.dateEmployment)) : '',
      idDateDismissal: personnelData.rawData.idDateDismissal,
      DateDismissal: personnelData.dateDismissal ? formatDateForBackend(new Date(personnelData.dateDismissal)) : '',
      idUserSex: personnelData.rawData.idUserSex,
      fvUserSex: personnelData.sex?.value,
      pvUserSex: personnelData.sex?.pv,
      idPosition: personnelData.rawData.idPosition,
      fvPosition: personnelData.position.value,
      pvPosition: personnelData.position.pv,
      idLocation: personnelData.rawData.idLocation,
      objLocation: personnelData.location.value,
      pvLocation: personnelData.location.pv,
      idUpdatedAt: personnelData.rawData.idUpdatedAt,
      UpdatedAt: today,
    }

    console.log('Отправка данных для обновления сотрудника:', payload)

    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/savePersonnal',
      params: ['upd', payload]
    })

    console.log('Ответ от сервера:', response.data)
    return response.data
  } catch (error) {
    console.error('Ошибка при обновлении сотрудника:', error)
    throw error
  }
}
