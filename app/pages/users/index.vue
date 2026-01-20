<script lang="ts" setup>
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

const { data: users, pending, error } = await useFetch('/api/users')
</script>

<template>
  <div>
    <h1>User Management</h1>
    <hr>
    <Combobox />
    <Button>Register New +</Button>
    <Table>
      <TableCaption>List of Users</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role Access</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="user in users" :key="user.id">
          <TableCell>{{ user.id }}</TableCell>
          <TableCell>{{ user.username }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
          <TableCell>{{ user.role }}</TableCell>
          <TableCell>{{ user.status }}</TableCell>
          <TableCell>
            <!-- Action buttons like Edit/Delete can go here -->
            <Button variant="secondary" size="icon">✏️</Button>
            <Button variant="destructive" size="icon">🗑️</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
      <!-- <div v-if="pending">Loading...</div>
      <div v-else-if="error">Error: {{ error.message }}</div>
      <div v-else>
        <pre>{{ users }}</pre>
      </div> -->
      
  </div>
</template>

<style>

</style>