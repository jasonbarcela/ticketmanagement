import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import api from '../../lib/axios'
import { Button } from '../../components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/Dialog'
import RegisterForm from '../../components/forms/RegisterForm'
import UserTable from '../../components/tables/UserTable'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { toast } from 'sonner'

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/auth/users')
      setUsers(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRegister = async (formData) => {
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const response = await api.post('/auth/register', formData)
      
      if (response.data.success) {
        toast.success('User created successfully')
        setIsDialogOpen(false)
        setSubmitError('')
        await fetchUsers()
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create user'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      // This would call an endpoint to update user status
      // For now, we'll just show a placeholder
      toast.info(`User status changed to ${newStatus}`)
      // await api.patch(`/auth/users/${userId}/status`, { status: newStatus })
      // await fetchUsers()
    } catch (err) {
      toast.error('Failed to update user status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new team member to the system
              </DialogDescription>
            </DialogHeader>
            <RegisterForm
              onSubmit={handleRegister}
              isLoading={isSubmitting}
              error={submitError}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Users Table */}
      {users.length === 0 ? (
        <EmptyState
          title="No users yet"
          description="Start by creating your first team member"
        />
      ) : (
        <UserTable
          users={users}
          onStatusChange={handleStatusChange}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  )
}
