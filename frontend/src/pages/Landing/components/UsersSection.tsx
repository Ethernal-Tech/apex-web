import { Typography, Box } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from 'swiper/modules';

const cards = [
	{
		id: 1,
		text: 'Skyline Bridge revolutionized how we move assets between blockchains. Fast, secure, and easy to use!',
		author: 'Blade, user',
	},
	{
		id: 2,
		text: 'The most reliable bridge we’ve used for connecting our dApps. Skyline makes cross-chain transfers effortless.',
		author: 'Ivan Bjelajac, founder',
	},
	{
		id: 3,
		text: 'An essential tool for any blockchain enthusiast. Skyline is leading the way in interoperability.',
		author: 'David Allen, DeFi expert',
	},
];

const UsersSection = () => (
	<Box className="users-section">
		<Box className="users-header">
			<Typography className="users-title">What Our Users Say</Typography>
			<Typography className="users-description">
				See how our technology is making an impact. Hear from our
				satisfied clients.
			</Typography>
		</Box>
		<Box className="users-content">
			{cards.map((card) => (
				<Box key={`card_${card.id}`} className="user-card">
					<Typography className="user-feedback">
						{card.text}
					</Typography>
					<Typography className="user-name">{card.author}</Typography>
				</Box>
			))}
		</Box>
		<Box className="user-cards-container">
			<Swiper
				modules={[Pagination]}
				spaceBetween={30}
				slidesPerView={1}
				pagination={{ clickable: true }}
			>
				{cards.map((card) => (
					<SwiperSlide key={`swipe_card_${card.id}`}>
						<Box className="user-card">
							<Typography className="user-feedback">
								{card.text}
							</Typography>
							<Typography className="user-name">
								{card.author}
							</Typography>
						</Box>
					</SwiperSlide>
				))}
			</Swiper>
		</Box>
	</Box>
);

export default UsersSection;
