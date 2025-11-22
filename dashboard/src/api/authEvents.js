let authFailureHandler = null;

export const registerAuthFailureHandler = (fn) => {
  authFailureHandler = fn;
};

export const onAuthFailure = () => {
  if (typeof authFailureHandler === 'function') authFailureHandler();
};

export default { registerAuthFailureHandler, onAuthFailure };
