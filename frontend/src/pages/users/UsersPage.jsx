import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import api from '../../lib/axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import RegisterForm from '../../components/auth/RegisterForm'
import UserTable from '../../components/users/UserTable'
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
        await fetchUsers()
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create user'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      // Placeholder since no specific endpoint was mentioned for this
      toast.info(`Status update for user ${userId} to ${newStatus} not implemented in API`)
    } catch (err) {
      toast.error('Failed to update user status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md sm:max-w-[425px]">
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

      {error && (
        <div className="p-4 bg-red-100/50 text-red-500 rounded-md">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="There are currently no users in the system."
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
