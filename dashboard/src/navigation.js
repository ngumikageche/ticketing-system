let _navigate = null;

export const setNavigate = (navigate) => {
  _navigate = navigate;
};

export const navigateTo = (to, options) => {
  if (_navigate) {
    _navigate(to, options);
  } else {
    // fallback to full page navigation if router navigate isn't set
    window.location.href = to;
  }
};
