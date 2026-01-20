const users = [
  { id: 1, username: 'Incha', email: 'incha@gmail.com', role: 'Observer', status: 'Active' },
  { id: 2, username: 'Rakhaa', email: 'rakha@gmail.com', role: 'Implemetataion Manager', status: 'Active' },
  { id: 3, username: 'Nico', email: 'nico@gmail.com', role: 'Staff', status: 'Inactive' },
]

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    return users
  }


})
