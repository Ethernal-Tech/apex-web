import { Box } from "@mui/material";

import AppBarComponent from "../../components/app-bar/AppBarComponent";
import FooterBar from "../../components/footerbar/FooterBar";

const BasePage = ({ children }: any) => {

    return (
        <div className="App">
            <AppBarComponent />
            <Box component='div' className="container">
                <Box sx={{ margin: '20px', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
                    {children}
                </Box>
            </Box>
            <FooterBar/>
        </div>
    )
}

export default BasePage;
