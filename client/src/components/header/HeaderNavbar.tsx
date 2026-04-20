/**
 * @fileoverview Application header component with responsive branding, institutional logos, and project information popover.
 * Provides QUEST tool branding with adaptive layout for desktop/mobile viewports.
 * @module Components.Header.HeaderNavBar
 */
import { remToPx } from '@/utils';
import { Group, Tooltip, Text, Anchor, Image, Popover, ActionIcon } from '@mantine/core';
import { HiOutlineInformationCircle } from 'react-icons/hi2';

/**
 * Main application header with QUEST branding and institutional partner logos.
 *
 * Features responsive design:
 * - Desktop: Shows all partner logos (KIMEKO, Uni Rostock, VAC) with detailed project info
 * - Mobile: Shows only info button with condensed project description
 *
 * @returns Header navigation bar component with branding and project information
 */
export const HeaderNavbar: React.FC = () => {
    return (
        <Group justify="space-between" h="100%">
            <Group gap={'xs'}>
                {/* QUEST tool branding with German tooltip */}
                <Tooltip position="right" label={'Qualitative Untersuchung und Evaluation von Sprachmodellen Tool'}>
                    <Text ff={'Orbitron'} fz={{ base: 24, sm: 30, md: 35 }} fw={500} px={'xs'}>
                        QUEST
                        <Text ff={'Arial'} fw={500} fz={{ base: 12, sm: 14, md: 17 }} span>
                            v0.1.0
                        </Text>
                    </Text>
                </Tooltip>
            </Group>

            {/* Desktop: Show logos and info button */}
            <Group display={{ base: 'none', sm: 'flex' }}>
                <Anchor href="https://kimeko.digital-hub.sh/" target="_blank">
                    <Image h={{ base: 40, sm: 45, md: 58 }} src={document.location.pathname + 'kimeko_logo.png'} alt="KIMEKO Logo" w="auto" />
                </Anchor>
                <Anchor href="https://www.uni-rostock.de/" target="_blank">
                    <Image h={{ base: 40, sm: 45, md: 58 }} src={document.location.pathname + 'uni_logo.jpg'} alt="Uni Logo" w="auto" />
                </Anchor>
                <Anchor href="https://vac.uni-rostock.de/" target="_blank">
                    <Image h={{ base: 40, sm: 45, md: 58 }} src={document.location.pathname + 'vac_logo.png'} alt="VAC Logo" w="auto" />
                </Anchor>

                {/* Detailed project information popover for desktop */}
                <Popover width={200} position="bottom" withArrow shadow="xl">
                    <Popover.Target>
                        <ActionIcon size="lg" variant="transparent" mx={{ base: 5, sm: 10, md: 20 }} onClick={() => {}}>
                            <HiOutlineInformationCircle size={remToPx(2)} />
                        </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown w={{ base: 300, sm: 400, md: 500 }}>
                        <Text size="sm" lh={1.5} ta={'justify'}>
                            This project was developed as part of the KI-Med Collaboration Platform (KiMeKo) project for the comparative analysis of AI models. The tool was created
                            by Felix Gratzkowski under the scientific supervision of{' '}
                            <Text span fs={'italic'}>
                                Dr. rer. nat. Sebastian Bader
                            </Text>{' '}
                            and{' '}
                            <Text fs={'italic'} span>
                                Dr.-Ing. Robin Nicolay
                            </Text>{' '}
                            at the University of Rostock. The project is funded by the BMBF (funding code 01IS24056D) and aims to accelerate the development of AI-based medical
                            products. It is part of a northern German ecosystem that brings together research institutions, clinics and companies to drive forward innovative
                            solutions in the field of medical technology.
                        </Text>
                    </Popover.Dropdown>
                </Popover>
            </Group>

            {/* Mobile: Show only info button with condensed description */}
            <Group display={{ base: 'flex', sm: 'none' }}>
                <Popover width={200} position="bottom" withArrow shadow="xl">
                    <Popover.Target>
                        <ActionIcon size="lg" variant="transparent" mx={5} onClick={() => {}}>
                            <HiOutlineInformationCircle size={remToPx(2)} />
                        </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown w={300}>
                        <Text size="sm" lh={1.5} ta={'justify'}>
                            This project was developed as part of the KI-Med Collaboration Platform (KiMeKo) project for the comparative analysis of AI models.
                        </Text>
                    </Popover.Dropdown>
                </Popover>
            </Group>
        </Group>
    );
};
