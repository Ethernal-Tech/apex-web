import { Typography } from '@mui/material';
import React, { ComponentType } from 'react';

// Middleware to display error text if users is using a mobile device
const withMiddleware = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const WithMiddlewareComponent: React.FC<P> = (props) => {
    const mobileOrTabletRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileDevice = mobileOrTabletRegex.test(navigator.userAgent);

    if (isMobileDevice) {
      return <Typography sx={{
        color:'white',
        textAlign:'center',
        position:'absolute',
        top:'50%',
        left:'50%',
        transform:'translateY(-50%) translateX(-50%)',
        width:'80%',
      }}>
        This application does not currently support mobile devices. For access, please visit this webpage in the chrome desktop browser.
      </Typography>;
    }

    return <WrappedComponent {...props} />;
  };

  return WithMiddlewareComponent;
};

export default withMiddleware;
