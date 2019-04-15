"""
Unit tests for the Category model
"""
from django.test import TestCase

from cms.api import add_plugin, create_page

from richie.apps.core.helpers import create_i18n_page
from richie.apps.courses.cms_plugins import CategoryPlugin
from richie.apps.courses.factories import (
    BlogPostFactory,
    CategoryFactory,
    CourseFactory,
    PersonFactory,
)
from richie.apps.courses.models import BlogPost, Course, Person


class CategoryModelsTestCase(TestCase):
    """
    Unit test suite to validate the behavior of the Category model
    """

    def test_models_category_str(self):
        """
        The string representation should be built with the title of the related page
        and its ancestors as long as they are category page.
        """
        not_a_category_page = create_page(
            "Categories", "richie/single_column.html", "en"
        )

        # Art
        page = create_page(
            "Art", "courses/cms/category_detail.html", "en", parent=not_a_category_page
        )
        category = CategoryFactory(extended_object=page)
        with self.assertNumQueries(4):
            self.assertEqual(str(category), "Art")

        # Art / Literature
        child_page = create_page(
            "Literature", "courses/cms/category_detail.html", "en", parent=page
        )
        child_category = CategoryFactory(extended_object=child_page)
        with self.assertNumQueries(5):
            self.assertEqual(str(child_category), "Art / Literature")

        # Art / Literature / Novels
        leaf_page = create_page(
            "Novels", "courses/cms/category_detail.html", "en", parent=child_page
        )
        leaf_category = CategoryFactory(extended_object=leaf_page)
        with self.assertNumQueries(6):
            self.assertEqual(str(leaf_category), "Art / Literature / Novels")

    def test_models_category_get_courses(self):
        """
        It should be possible to retrieve the list of related courses on the category instance.
        The number of queries should be minimal.
        """
        category = CategoryFactory(should_publish=True)
        courses = CourseFactory.create_batch(
            3, page_title="my title", fill_categories=[category], should_publish=True
        )
        retrieved_courses = category.get_courses()

        with self.assertNumQueries(2):
            self.assertEqual(set(retrieved_courses), set(courses))

        with self.assertNumQueries(0):
            for course in retrieved_courses:
                self.assertEqual(
                    course.extended_object.prefetched_titles[0].title, "my title"
                )

    def test_models_category_get_courses_several_languages(self):
        """
        The courses should not be duplicated if they exist in several languages.
        """
        category = CategoryFactory(should_publish=True)
        CourseFactory(
            page_title={"en": "my title", "fr": "mon titre"},
            fill_categories=[category],
            should_publish=True,
        )
        self.assertEqual(Course.objects.count(), 2)
        self.assertEqual(category.get_courses().count(), 1)

    def test_models_category_get_courses_snapshots(self):
        """
        Snapshot courses should be excluded from the list of courses returned.
        The new filter query we added to exclude snapshots should not create duplicates.
        Indeed, we had to add a "distinct" clause to the query so this test enforces it.
        """
        # We create a root page because it was responsible for duplicate results when the
        # distinct clause is not applied.
        # This is because of the clause "extended_object__node__parent__cms_pages__..."
        # which is there to exclude snapshots but also acts on the main course page and
        # checks its parent (so the root page) and the duplicate comes from the fact that
        # the parent has a draft and a public page... so "cms_pages" has a cardinality of 2
        root_page = create_i18n_page(published=True)

        category = CategoryFactory(should_publish=True)
        course = CourseFactory(
            page_parent=root_page, fill_categories=[category], should_publish=True
        )
        CourseFactory(
            page_parent=course.extended_object,
            fill_categories=[category],
            should_publish=True,
        )

        self.assertEqual(Course.objects.count(), 4)
        self.assertEqual(category.get_courses().count(), 1)
        self.assertEqual(category.public_extension.get_courses().count(), 1)

    def test_models_category_get_blogposts(self):
        """
        It should be possible to retrieve the list of related blogposts on the category
        instance. The number of queries should be minimal.
        """
        category = CategoryFactory(should_publish=True)
        blogposts = BlogPostFactory.create_batch(
            2, page_title="my title", fill_categories=[category], should_publish=True
        )
        retrieved_blogposts = category.get_blogposts()

        with self.assertNumQueries(2):
            self.assertEqual(set(retrieved_blogposts), set(blogposts))

        with self.assertNumQueries(0):
            for blogpost in retrieved_blogposts:
                self.assertEqual(
                    blogpost.extended_object.prefetched_titles[0].title, "my title"
                )

    def test_models_category_get_blogposts_several_languages(self):
        """
        The blogposts should not be duplicated if they exist in several languages.
        """
        category = CategoryFactory(should_publish=True)
        BlogPostFactory(
            page_title={"en": "my title", "fr": "mon titre"},
            fill_categories=[category],
            should_publish=True,
        )
        self.assertEqual(BlogPost.objects.count(), 2)
        self.assertEqual(category.get_blogposts().count(), 1)

    def test_models_category_get_persons(self):
        """
        It should be possible to retrieve the list of related persons on the category
        instance. The number of queries should be minimal.
        """
        category = CategoryFactory(should_publish=True)
        persons = PersonFactory.create_batch(
            2, page_title="my title", fill_categories=[category], should_publish=True
        )
        retrieved_persons = category.get_persons()

        with self.assertNumQueries(2):
            self.assertEqual(set(retrieved_persons), set(persons))

        with self.assertNumQueries(0):
            for person in retrieved_persons:
                self.assertEqual(
                    person.extended_object.prefetched_titles[0].title, "my title"
                )

    def test_models_category_get_persons_public_category_page(self):
        """
        When a category is added on a draft person, the person should not be visible on
        the public category page until the person is published.
        """
        category = CategoryFactory(should_publish=True)
        category_page = category.extended_object
        person = PersonFactory(page_title="my title", should_publish=True)
        person_page = person.extended_object

        # Add a category to the person but don't publish the modification
        placeholder = person_page.placeholders.get(slot="categories")
        add_plugin(placeholder, CategoryPlugin, "en", page=category_page)

        self.assertEqual(list(category.get_persons()), [person])
        self.assertEqual(list(category.public_extension.get_persons()), [])

        # Now publish the modification and check that the person is displayed
        # on the public category page
        person.extended_object.publish("en")
        self.assertEqual(
            list(category.public_extension.get_persons()), [person.public_extension]
        )

    def test_models_category_get_persons_several_languages(self):
        """
        The persons should not be duplicated if they exist in several languages.
        """
        category = CategoryFactory(should_publish=True)
        PersonFactory(
            page_title={"en": "my title", "fr": "mon titre"},
            fill_categories=[category],
            should_publish=True,
        )
        self.assertEqual(Person.objects.count(), 2)
        self.assertEqual(category.get_persons().count(), 1)
