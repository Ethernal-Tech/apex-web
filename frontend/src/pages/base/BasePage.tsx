import { Box } from "@mui/material";

import AppBarComponent from "../../components/app-bar/AppBarComponent";

const BasePage = ({ children }: any) => {

    return (
        <div className="App">
            <AppBarComponent />
            <Box sx={{ margin: '20px', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
                {children}
            </Box>
        </div>
    )
}

export default BasePage;
