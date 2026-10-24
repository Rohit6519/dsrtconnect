# Integration snippets — reference only

To show opportunities on a Venture page:

  import { OpportunitiesSection } from "@/components/looking-for/embed/OpportunitiesSection"

  <OpportunitiesSection
    scope="venture"
    slug={venture.slug}
    title="Open Roles"
    emptyMessage="This venture isn'\''t hiring right now."
  />

To show opportunities on a Project page:

  <OpportunitiesSection
    scope="project"
    slug={project.slug}
    title="Open Positions"
  />

To show opportunities on a Profile page:

  <OpportunitiesSection
    scope="profile"
    slug={profile.username}
    title="Currently Recruiting"
    emptyMessage="No open opportunities from this builder right now."
  />
