import { Outlet } from 'react-router-dom';

const Mathematics = () => {
  return (
    <div>
      <h1>Math</h1>
      <Outlet />
    </div>
  );
};
  
  export default Mathematics;