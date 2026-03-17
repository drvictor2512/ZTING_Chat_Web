import React from 'react'
import { MdEdit, MdPersonAdd, MdPeople, MdLink } from 'react-icons/md'
import FriendsNav from './FriendsNav'
import ContactList from './ContactList'

const ContactsPanel = ({
    currentView,
    searchTerm,
    onSearchTermChange,
    onOpenAddFriendModal,
    onOpenCreateGroupModal,
    onOpenJoinGroupModal,
    error,
    friendsView,
    friendRequestCount,
    onChangeFriendsView,
    onLoadFriendRequests,
    loading,
    filteredContacts,
    selectedContact,
    onContactClick,
    onOpenUserPopup,
    currentUser,
    onlineStatus,
    formatRelative
}) => {
    if (!(currentView === 'friends' || currentView === 'chat')) {
        return null
    }

    return (
        <div className="contacts-panel">
            <div className="contacts-header">
                <div className="search-wrapper">
                    <MdEdit className="search-icon" />
                    <input
                        className="search"
                        placeholder="Tìm tên/ email"
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                    />
                </div>
                <div className="contacts-icon-group">
                    <div className="icon" title="Thêm bạn" onClick={onOpenAddFriendModal}>
                        <MdPersonAdd />
                    </div>
                    <div className="icon" title="Tạo nhóm chat" onClick={onOpenCreateGroupModal}>
                        <MdPeople />
                    </div>
                    <div className="icon" title="Tham gia nhóm bằng mã" onClick={onOpenJoinGroupModal}>
                        <MdLink />
                    </div>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {currentView === 'friends' ? (
                <FriendsNav
                    friendsView={friendsView}
                    friendRequestCount={friendRequestCount}
                    onChangeView={onChangeFriendsView}
                    onOpenFriendRequests={onLoadFriendRequests}
                />
            ) : loading ? (
                <div className="loading-state">
                    <p>Đang tải...</p>
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="empty-contacts">
                    <p>Không tìm thấy liên hệ nào</p>
                </div>
            ) : (
                <ContactList
                    filteredContacts={filteredContacts}
                    selectedContact={selectedContact}
                    onContactClick={onContactClick}
                    onOpenUserPopup={onOpenUserPopup}
                    currentUser={currentUser}
                    onlineStatus={onlineStatus}
                    formatRelative={formatRelative}
                />
            )}
        </div>
    )
}

export default ContactsPanel
