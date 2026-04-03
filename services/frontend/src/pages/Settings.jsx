import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Users, MapPin, Gift, Link2, Github, Linkedin, Twitter, FileText,
    Briefcase, GraduationCap, Wrench, Code, BarChart, Camera, ChevronRight,
    X, Info, Check, ArrowLeft
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const XIcon = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l16 16M4 20L20 4" />
    </svg>
);

const SettingsRow = ({ icon: Icon, label, value, valueNode, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '20px 24px', backgroundColor: 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background-color 0.2s',
            cursor: 'pointer', textAlign: 'left', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Icon size={20} color="#9ca3af" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 600 }}>{label}</span>
                {valueNode ? valueNode : (value && <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '4px' }}>{value}</span>)}
            </div>
        </div>
        <ChevronRight size={20} color="#6b7280" />
    </button>
);

const ToggleRow = ({ icon: Icon, label, isActive, onToggle }) => (
    <div
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '20px 24px', backgroundColor: 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Icon size={20} color="#9ca3af" />
            <span style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 600 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
                onClick={onToggle}
                style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    backgroundColor: isActive ? '#e5e7eb' : '#374151',
                    position: 'relative', transition: 'background-color 0.2s',
                    border: 'none', cursor: 'pointer'
                }}
            >
                <div style={{
                    position: 'absolute', top: '2px', left: isActive ? '22px' : '2px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: isActive ? '#0a0a0a' : '#9ca3af',
                    transition: 'all 0.2s ease-in-out'
                }} />
            </button>
            <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, width: '24px' }}>
                {isActive ? 'On' : 'Off'}
            </span>
        </div>
    </div>
);

export default function Settings() {
    const { user, updateUser } = useAuthStore();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const buildProfileFromUser = (currentUser) => ({
        displayName: currentUser?.displayName || 'Code Runner',
        gender: currentUser?.gender || 'Male',
        location: currentUser?.location || 'India',
        birthday: currentUser?.birthday || '',
        websites: currentUser?.websites || '',
        github: currentUser?.github || '',
        linkedin: currentUser?.linkedin || '',
        x: currentUser?.x || '',
        readme: currentUser?.readme || '',
        work: currentUser?.work || '',
        education: currentUser?.education || '',
        skills: currentUser?.skills || '',
        recentAC: currentUser?.recentAC !== undefined ? currentUser.recentAC : true,
        heatmap: currentUser?.heatmap !== undefined ? currentUser.heatmap : true,
        avatar: currentUser?.avatar || null,
    })

    // Settings are stored per-user in the auth store (local user directory), not a shared localStorage key.
    const [profile, setProfile] = useState(() => buildProfileFromUser(user));

    useEffect(() => {
        setProfile(buildProfileFromUser(user))
    }, [user?.username]);

    // Modal State
    const [editModal, setEditModal] = useState({ isOpen: false, key: '', label: '', value: '' });
    const [toast, setToast] = useState(false);

    const openModal = (key, label) => {
        setEditModal({ isOpen: true, key, label, value: profile[key] || '' });
    };

    const handleSave = () => {
        const { key, value } = editModal;
        setProfile(prev => ({ ...prev, [key]: value }));
        updateUser({ [key]: value });

        setEditModal({ isOpen: false, key: '', label: '', value: '' });
        setToast(true);
        setTimeout(() => setToast(false), 3000);
    };

    // Helper for Avatar changing
    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Optional: Basic validation to prevent immediate 100MB browser crash
            if (file.size > 2 * 1024 * 1024) { 
                alert('Please select an image smaller than 2MB.');
                e.target.value = null;
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setProfile(p => ({ ...p, avatar: base64String }));
                updateUser({ avatar: base64String });
                setToast(true);
                setTimeout(() => setToast(false), 3000);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = null; // reset to allow selecting same file again
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0e0e0e', paddingBottom: '100px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
                
                {/* BACK BUTTON */}
                <button
                    onClick={() => navigate(user?.username ? `/profile/${user.username}` : '/profile')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af',
                        backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '14px', fontWeight: 500, marginBottom: '32px', transition: 'color 0.2s',
                        padding: 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                    <ArrowLeft size={16} /> Back to Profile
                </button>

                {/* HIDDEN FILE INPUT FOR AVATAR */}
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                />

                {/* GENERAL SECTION */}
                <div style={{ marginBottom: '48px' }}>
                    <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>General</h2>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>Manage your basic profile information.</p>
                    
                    <div style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
                        <SettingsRow 
                            icon={Camera} 
                            label="Profile Picture" 
                            valueNode={profile.avatar ? <img src={profile.avatar} alt="Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginLeft: '6px' }} /> : <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '4px' }}>Upload Image</span>} 
                            onClick={handleAvatarClick} 
                        />
                        <SettingsRow icon={User} label="Display Name" value={profile.displayName} onClick={() => openModal('displayName', 'Display Name')} />
                        <SettingsRow icon={Users} label="Gender" value={profile.gender} onClick={() => openModal('gender', 'Gender')} />
                        <SettingsRow icon={MapPin} label="Location" value={profile.location} onClick={() => openModal('location', 'Location')} />
                        <SettingsRow icon={Gift} label="Birthday" value={profile.birthday} onClick={() => openModal('birthday', 'Birthday')} />
                        <SettingsRow icon={Link2} label="Websites" value={profile.websites} onClick={() => openModal('websites', 'Websites')} />
                        <SettingsRow icon={Github} label="GitHub" value={profile.github} onClick={() => openModal('github', 'GitHub URL')} />
                        <SettingsRow icon={Linkedin} label="LinkedIn" value={profile.linkedin} onClick={() => openModal('linkedin', 'LinkedIn URL')} />
                        <SettingsRow icon={XIcon} label="X" value={profile.x} onClick={() => openModal('x', 'X (Twitter) Handle')} />
                        <SettingsRow icon={FileText} label="ReadMe" value={profile.readme} onClick={() => openModal('readme', 'ReadMe Bio')} />
                    </div>
                </div>

                {/* EXPERIENCE SECTION */}
                <div style={{ marginBottom: '48px' }}>
                    <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Experience</h2>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>Share your growth from learning to career.</p>
                    
                    <div style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
                        <SettingsRow icon={Briefcase} label="Work" value={profile.work} onClick={() => openModal('work', 'Work Experience')} />
                        <SettingsRow icon={GraduationCap} label="Education" value={profile.education} onClick={() => openModal('education', 'Education')} />
                        <SettingsRow icon={Wrench} label="Skills" value={profile.skills} onClick={() => openModal('skills', 'Skills')} />
                    </div>
                </div>

                {/* CURATE PROFILE SECTION */}
                <div>
                    <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Curate your profile</h2>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>Control what opens to the public.</p>
                    
                    <div style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
                        <ToggleRow 
                            icon={Code} 
                            label="Recent AC Problems and Submission Details" 
                            isActive={profile.recentAC}
                            onToggle={() => {
                                setProfile(p => {
                                    const next = !p.recentAC
                                    updateUser({ recentAC: next })
                                    return { ...p, recentAC: next }
                                });
                                setToast(true);
                                setTimeout(() => setToast(false), 3000);
                            }}
                        />
                        <ToggleRow 
                            icon={BarChart} 
                            label="Submission Heatmap" 
                            isActive={profile.heatmap}
                            onToggle={() => {
                                setProfile(p => {
                                    const next = !p.heatmap
                                    updateUser({ heatmap: next })
                                    return { ...p, heatmap: next }
                                });
                                setToast(true);
                                setTimeout(() => setToast(false), 3000);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* UPDATE MODAL */}
            {editModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="animate-fade-in" style={{ width: '460px', backgroundColor: '#1f1f1f', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '19px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Info size={14} color="#fff" strokeWidth={3} />
                                </div>
                                Update {editModal.label}
                            </h3>
                            <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} style={{ color: '#9ca3af', padding: '4px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <p style={{ color: '#9ca3af', fontSize: '15px', marginBottom: '20px' }}>
                            Changing your {editModal.label.toLowerCase()} won't change your username
                        </p>

                        <input 
                            type="text"
                            value={editModal.value}
                            onChange={(e) => setEditModal(prev => ({ ...prev, value: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                            style={{ 
                                width: '100%', padding: '14px 16px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.15)', 
                                borderRadius: '12px', color: '#fff', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s', marginBottom: '24px'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                            autoFocus
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                                style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#333', color: '#fff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor='#444'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor='#333'}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                style={{ padding: '10px 24px', borderRadius: '10px', backgroundColor: '#1d4ed8', color: '#fff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor='#2563eb'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="animate-slide-down" style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#22c55e', color: '#000', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100000, boxShadow: '0 10px 25px -5px rgba(34,197,94,0.4)', fontWeight: 600, fontSize: '14px' }}>
                    <Check size={18} strokeWidth={3} /> Successfully updated profile
                </div>
            )}
        </div>
    );
}
