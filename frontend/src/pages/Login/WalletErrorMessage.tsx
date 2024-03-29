import { Box, Typography, Button } from "@mui/material";
import data from "../../features/walletButtonsData.json";
import { WalletErrors } from "../../features/enums";

type NoWalletMessageType = {
    type: WalletErrors | undefined;
    onClose?: () => void
}

const WalletButton = ({ href, imageUrl, alt, text }: { href: string, imageUrl: string, alt: string, text: string }) => {
    return (
        <Button
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            startIcon={<img src={imageUrl} width={24} alt={alt} />}
            sx={{ mx: 1, width: 200, justifyContent: 'flex-start' }}
        >
            {text}
        </Button>
    );
};

function NoWalletsAvailable() {
    return (
        <>
            <Typography id="modal-modal-title" variant="h6" component="h2">
                No wallet found!
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>

                <Typography id="modal-modal-description">
                    Please install one of the following extensions and conect your wallet.
                    <Box sx={{ width: 200 }}>
                        {data.map((item, index) => (
                            <WalletButton key={index} {...item} />
                        ))}
                    </Box>

                </Typography>
            </Box>
        </>
    )
}

function WalletNotEnabled() {
    return (
        <>
            <Typography id="modal-modal-title" variant="h6" component="h2">
                Wallet not enabled!
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Typography id="modal-modal-description">
                    Please enable the wallet and try again.
                </Typography>
            </Box>
        </>
    )
}

function WalletErrorMessage({ type, onClose }: NoWalletMessageType) {
    return (
        <Box
            sx={{
                width: 600,
                boxShadow: 24,
                p: 4,
                bgcolor: 'background.paper',
                border: '2px solid grey',
                borderRadius: 4,
                zIndex: 1,
                position: 'relative'
            }}
        >
            {type === WalletErrors.NoWalletsAvailable && <NoWalletsAvailable />}
            {type === WalletErrors.WalletNotEnabled && <WalletNotEnabled />}
            <Box sx={{ textAlign: 'right' }} >
                <Button
                    onClick={onClose}
                    variant="text"
                    color="secondary"
                >
                    Close
                </Button>
            </Box>
        </Box>
    )
}

export default WalletErrorMessage;