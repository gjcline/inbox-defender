import * as React from "react"
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Menu, X, Shield, Lock } from 'lucide-react'

const menuItems = [
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Support', href: '#support' },
]

export const HeroSection = () => {
    const navigate = useNavigate()
    const [menuState, setMenuState] = React.useState(false)
    return (
        <div>
            <header>
                <nav
                    data-state={menuState && 'active'}
                    className="group fixed z-20 w-full border-b border-dashed bg-white backdrop-blur md:relative dark:bg-zinc-950/50 lg:dark:bg-transparent">
                    <div className="m-auto max-w-5xl px-6">
                        <div className="flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                            <div className="flex w-full justify-between lg:w-auto">
                                <a
                                    href="#"
                                    aria-label="home"
                                    className="flex items-center space-x-2">
                                    <Logo />
                                </a>

                                <button
                                    onClick={() => setMenuState(!menuState)}
                                    aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                    className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                    <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                    <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                                </button>
                            </div>

                            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                                <div className="lg:pr-4">
                                    <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                                        {menuItems.map((item, index) => (
                                            <li key={index}>
                                                <a
                                                    href={item.href}
                                                    className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                    <span>{item.name}</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:pl-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const pricingSection = document.getElementById('pricing');
                                            pricingSection?.scrollIntoView({ behavior: 'smooth' });
                                        }}>
                                        <span>Pricing</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate('/connect')}>
                                        <span>Connect Gmail</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>

            <main>
                <div
                    aria-hidden
                    className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
                    <div className="w-[35rem] h-[80rem] -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(220,70%,50%,.08)_0,hsla(220,60%,30%,.02)_50%,hsla(220,50%,20%,0)_80%)]" />
                    <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(220,70%,50%,.06)_0,hsla(220,60%,30%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div className="h-[80rem] -translate-y-87.5 absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(220,70%,50%,.04)_0,hsla(220,60%,30%,.02)_80%,transparent_100%)]" />
                </div>

                <section className="overflow-hidden bg-white dark:bg-transparent">
                    <div className="relative mx-auto max-w-5xl px-6 py-28 lg:py-24">
                        {/* Trust indicator */}
                        <div className="relative z-10 mx-auto max-w-2xl text-center mb-8">
                            <div className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-sm mb-8 w-fit mx-auto">
                                <Lock className="w-4 h-4 text-blue-600" />
                                <span className="text-blue-700 font-medium">Google OAuth • No inbox sharing • 1-click undo</span>
                            </div>
                        </div>

                        <div className="relative z-10 mx-auto max-w-2xl text-center">
                            <h1 className="text-balance text-4xl font-semibold md:text-5xl lg:text-6xl">This is the last cold email you'll read.</h1>
                            <p className="mx-auto my-8 max-w-2xl text-xl text-gray-600">Inbox Defender auto-routes cold outreach and sales pitches into a quiet folder—so your inbox stays focused.</p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Button size="lg" onClick={() => navigate('/connect')}>
                                    <span>Connect Gmail</span>
                                </Button>
                                <Button variant="outline" size="lg" onClick={() => {
                                    const pricingSection = document.getElementById('pricing');
                                    pricingSection?.scrollIntoView({ behavior: 'smooth' });
                                }}>
                                    <span>Pricing</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mx-auto -mt-16 max-w-7xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
                        <div className="[perspective:1200px] [mask-image:linear-gradient(to_right,black_50%,transparent_100%)] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
                            <div className="[transform:rotateX(20deg);]">
                                <div className="lg:h-[44rem] relative skew-x-[.36rad]">
                                    <img
                                        className="rounded-[--radius] z-[2] relative border shadow-2xl"
                                        src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=2880&h=2074&fit=crop&crop=top"
                                        alt="Gmail inbox interface"
                                        width={2880}
                                        height={2074}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

export const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <img src="/QO02OdK0_400x400.jpg" alt="Inbox Defender Logo" className="w-8 h-8 rounded-full" />
            <span className="text-xl font-bold text-gray-900">Inbox Defender</span>
        </div>
    )
}