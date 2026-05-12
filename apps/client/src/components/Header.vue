<template>
  <BNavbar v-b-color-mode="'dark'" toggleable="lg" variant="primary" sticky="true">
    <BNavbarBrand href="#navbar-overview">PingPong Explorer</BNavbarBrand>
    <BNavbarToggle target="nav-collapse" />
    <BCollapse id="nav-collapse" is-nav>
      <BNavbarNav>
        <BNavItem href="#navbar-overview">Link</BNavItem>
        <BNavItem href="#navbar-overview" disabled>Disabled</BNavItem>
      </BNavbarNav>
      <!-- Right aligned nav items -->
      <BNavbarNav class="ms-auto mb-2 mb-lg-0">
        <BNavItemDropdown text="Lang" right>
          <BDropdownItem>EN</BDropdownItem>
          <BDropdownItem>ES</BDropdownItem>
          <BDropdownItem>RU</BDropdownItem>
          <BDropdownItem>FA</BDropdownItem>
        </BNavItemDropdown>
        <BNavItemDropdown right>
          <!-- Using 'button-content' slot -->
          <template #button-content>
            <em>User</em>
          </template>
          <BDropdownItem>Profile</BDropdownItem>
          <BDropdownItem>Sign Out</BDropdownItem>
        </BNavItemDropdown>
      </BNavbarNav>
      <BNavForm class="d-flex">
        <BFormInput class="me-2" placeholder="Search" />
        <BButton type="submit" variant="outline-success">Search</BButton>
      </BNavForm>
    </BCollapse>
  </BNavbar>
</template>
<script setup lang="ts"></script>
