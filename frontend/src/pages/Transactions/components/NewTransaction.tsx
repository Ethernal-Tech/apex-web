import { Box, Typography } from "@mui/material";
import AddressBalance from "./AddressBalance";
import TotalBalance from "./TotalBalance";
import { chainIcons } from "../../../utils/generalUtils";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import React from "react";
import { ChainEnum } from "../../../swagger/apexBridgeApiService";
import ReputationSystemWidget from "../RepSystem/ReputationSystemWidget";

const tabletMediaQuery = '@media (max-width:800px)'

type NewTransactionProps = {
	txInProgress: boolean
	children: React.ReactNode
}

function NewTransaction({txInProgress, children}: NewTransactionProps) {
	const chain = useSelector((state: RootState)=> state.chain.chain);
	const destinationChain = useSelector((state: RootState)=> state.chain.destinationChain);
	const SourceIcon = chainIcons[chain];
	const DestinationIcon = chainIcons[destinationChain];
	return (
		<Box width={'100%'} sx={{
			display:'grid',
			gridTemplateColumns:'repeat(6,1fr)', 
			gap:'24px',
			marginBottom:'30px'
		}}>
			<Box sx={{ 
				gridColumn:'span 2', 
				color:'white', 
				textTransform:'capitalize',
				[tabletMediaQuery]:{
					gridColumn:'span 3'
					}
				}}>
				<Typography>Source</Typography>
				<Box sx={{display:'flex', alignItems:'center'}}>
					<SourceIcon width={'40px'} height={'40px'}/>
					<Typography fontSize={'27px'} sx={{marginLeft:'10px', marginTop:'15px'}} fontWeight={500}>
						{chain}
					</Typography>
				</Box>
			</Box>

			<Box sx={{ 
				gridColumn:'span 4', 
				color:'white', 
				textTransform:'capitalize',
				[tabletMediaQuery]:{
					gridColumn:'span 3'
				}
			}}>
				<Typography>Destination</Typography>
				<Box sx={{display:'flex', alignItems:'center'}}>
					<DestinationIcon width={'40px'} height={'40px'}/>
					<Typography fontSize={'27px'} sx={{marginLeft:'10px', marginTop:'15px'}} fontWeight={500}>
						{destinationChain}
					</Typography>
				</Box>
			</Box>

			{/* left side */}
			<Box sx={{
				gridColumn:'span 2',
				[tabletMediaQuery]:{
					gridColumn:'span 6'
				},
			}}>
				{/* TotalBanace and AddressBalance widgets */}
				<Box sx={{
					borderTop:`2px solid ${chain === ChainEnum.Prime ? '#077368' : '#F25041'}`,
					p:2,
					background:'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
				}}>
					<TotalBalance/>
					
					<Typography sx={{color:'white',mt:4, mb:2}}>Address</Typography>
					<AddressBalance/>
				</Box>

				{/* Conditional display of Reputation System Widget */}
				{txInProgress && <ReputationSystemWidget/>}
			</Box>
			
			{/* right side */}
			<Box sx={{
				gridColumn:'span 4', 
				borderTop:`2px solid ${destinationChain === ChainEnum.Prime ? '#077368' : '#F25041'}`,
				p:2,
				background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
				[tabletMediaQuery]:{
					gridColumn:'span 6'
				}
			}}>
				{children}
			</Box>
		</Box>
	)
}

export default NewTransaction;