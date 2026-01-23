import type { User, UserForm } from '../../shared/types/user';

export const useUsers = () => {
  const getUsers = async () => {
    return await $fetch<{ users: User[] }>('/api/users');
  }

  const getUser = async (id: number) => {
    return await $fetch<{ user: User}>(`/api/users/${id}`);
  }

  const createUser = async (userData: UserForm) => {
    return await $fetch<{ success: boolean; user: User }>('/api/users', {
      method: 'POST',
      body: userData
    })
  }

  const updateUser = async (id: number, userData: UserForm) => {
    return await $fetch<{ success: boolean; user: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: userData
    })
  }

  const deleteUser = async (id: number) => {
    return await $fetch<{ success: boolean, message: string }>(`/api/users/${id}`, {
      method: 'DELETE'
    })  
  }

  return {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
  }
}
