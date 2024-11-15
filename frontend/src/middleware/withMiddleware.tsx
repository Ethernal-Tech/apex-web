import { Box, Link, List, ListItem, Typography } from '@mui/material';
import React, { ComponentType } from 'react';

// Middleware to display error text if users is using a mobile device
const withMiddleware = <P extends object>(
	WrappedComponent: ComponentType<P>,
) => {
	const WithMiddlewareComponent: React.FC<P> = (props) => {
		const mobileOrTabletRegex =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
		const isMobileDevice = mobileOrTabletRegex.test(navigator.userAgent);

		if (isMobileDevice) {
			return (
				<Box
					px={4}
					sx={{
						color: 'white',
						textAlign: 'left',
						position: 'absolute',
						left: '50%',
						// top:'50%',
						// transform:'translateY(-50%) translateX(-50%)',
						transform: 'translateX(-50%)',
						width: '90%',
					}}
				>
					<Typography
						variant="h3"
						sx={{ textAlign: 'center', mt: 8 }}
					>
						Unsupported Device
					</Typography>
					<Typography sx={{ mt: 4 }}>
						It looks like you're accessing the Apex Bridge on a
						mobile device. Apex Bridge is currently only available
						as a web application and requires a desktop browser with
						the{' '}
						<Link
							href="https://chromewebstore.google.com/detail/eternl-beta/aafgiaaomjbkmgainbdgjpcndnodkajp"
							target="_blank"
							rel="noreferrer"
						>
							Eternl Beta
						</Link>{' '}
						chrome extension.
					</Typography>

					<Typography sx={{ mt: 2 }}>
						To use the Apex Brigde, please follow these steps:
					</Typography>

					<List
						component={'ol'}
						sx={{ listStyle: 'decimal', paddingLeft: 3 }}
					>
						<ListItem sx={{ display: 'list-item' }}>
							Open a desktop browser that supports chrome
							extensions.
						</ListItem>
						<ListItem sx={{ display: 'list-item' }}>
							Connect via the Ethernal Beta Wallet extension.
						</ListItem>
						<ListItem sx={{ display: 'list-item' }}>
							Move your Apex Tokens
						</ListItem>
					</List>

					<Typography sx={{ mt: 2 }}>
						Thank you for your understanding and support!
					</Typography>
				</Box>
			);
		}

		return <WrappedComponent {...props} />;
	};

	return WithMiddlewareComponent;
};

export default withMiddleware;
