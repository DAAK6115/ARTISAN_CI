export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getUserRole = () => {
  return localStorage.getItem('role');
};
