import { Box } from "@mui/material";

import AppBarComponent from "../../components/app-bar/AppBarComponent";
import FooterBar from "../../components/footerbar/FooterBar";
import LockedTokensComponent from "../../components/lockedTokens/LockedTokensComponent";

const BasePage = ({ children }: any) => {

    return (
        <div className="App">
            <AppBarComponent />
            <LockedTokensComponent/>
            <Box component='div' className="container">
                <Box sx={{ margin: '15px 20px 0px 20px', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
                    {children}
                </Box>
            </Box>
            <FooterBar/>
        </div>
    )
}

export default BasePage;
